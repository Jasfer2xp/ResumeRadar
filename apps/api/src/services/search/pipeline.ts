import type { CandidateProfile, JobProfile, JobWithMatch, SearchResult } from '@resumeradar/shared';
import { Prisma } from '@prisma/client';
import {
  calculateDeterministicScore,
  combineScores,
  deduplicateSearchResults,
  filterIndividualJobResults,
  generateSearchQueries,
  prioritizeJobResults,
} from '@resumeradar/shared';
import { config } from '../../config.js';
import { prisma } from '../../database/client.js';
import { createAIProvider } from '../../providers/ai/nvidia.js';
import { createSearchProvider } from '../../providers/search/tavily.js';
import { extractText } from '../resume/extractor.js';

const ai = createAIProvider();
const search = createSearchProvider();

function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function normalizeJobFromSearch(
  result: SearchResult,
  analysis: Partial<JobProfile>
): JobProfile {
  return {
    title: analysis.title ?? result.title,
    company: analysis.company ?? result.company ?? null,
    location: analysis.location ?? null,
    work_type: analysis.work_type ?? null,
    employment_type: analysis.employment_type ?? null,
    salary_min: analysis.salary_min ?? null,
    salary_max: analysis.salary_max ?? null,
    currency: analysis.currency ?? null,
    description: analysis.description ?? result.snippet,
    requirements: analysis.requirements ?? [],
    job_url: result.url,
    source_name: result.source,
    posted_at: analysis.posted_at ?? null,
  };
}

export async function runSearchPipeline(resumeId: string, searchRunId: string): Promise<void> {
  const updateStep = async (step: string, status: string) => {
    await prisma.searchRun.update({
      where: { id: searchRunId },
      data: { currentStep: step, status },
    });
  };

  try {
    const resume = await prisma.resume.findUniqueOrThrow({ where: { id: resumeId } });

    await updateStep('extracting', 'extracting');
    let text = resume.extractedText;
    if (!text) {
      text = await extractText(resume.storagePath, resume.fileType);
      await prisma.resume.update({
        where: { id: resumeId },
        data: { extractedText: text },
      });
    }

    if (!text) {
      throw new Error('Failed to extract text from resume');
    }

    await updateStep('understanding', 'analyzing');
    const profile = await ai.analyzeResume({ text, filename: resume.filename });

    const preferencesJson = (profile.preferences ?? {}) as Prisma.InputJsonValue;

    await prisma.candidateProfile.upsert({
      where: { resumeId },
      create: {
        resumeId,
        jobTitles: profile.job_titles,
        skills: profile.skills,
        inferredSkills: profile.inferred_skills,
        experienceLevel: profile.experience_level,
        education: profile.education,
        locations: profile.locations,
        preferences: preferencesJson,
      },
      update: {
        jobTitles: profile.job_titles,
        skills: profile.skills,
        inferredSkills: profile.inferred_skills,
        experienceLevel: profile.experience_level,
        education: profile.education,
        locations: profile.locations,
        preferences: preferencesJson,
      },
    });

    await updateStep('job_titles', 'generating_queries');
    const queries = generateSearchQueries(profile);
    await prisma.searchRun.update({
      where: { id: searchRunId },
      data: { queries },
    });

    await updateStep('searching', 'searching');
    const allResults: SearchResult[] = [];
    for (const query of queries) {
      try {
        const results = await search.search(query);
        allResults.push(...results);
      } catch (err) {
        console.error(`Search failed for query "${query}":`, err);
      }
    }

    const deduped = deduplicateSearchResults(allResults);
    const individualJobs = filterIndividualJobResults(deduped);
    const prioritized = prioritizeJobResults(individualJobs).slice(0, config.maxSearchResults);
    const candidateJobs = prioritized.slice(0, config.maxJobsToMatch);

    await updateStep('analyzing_jobs', 'matching');

    // Process jobs in parallel with a concurrency limit to avoid flooding the NVIDIA API
    const CONCURRENCY = 5;
    const matches: JobWithMatch[] = [];
    const queue = [...candidateJobs];

    async function processJob(result: SearchResult): Promise<void> {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const analysis = await ai.analyzeJob({
            title: result.title,
            snippet: result.snippet,
            url: result.url,
          });

          const jobProfile = normalizeJobFromSearch(result, analysis);
          const aiMatch = await ai.matchJob(profile, jobProfile);

          const { breakdown, matchedSkills } = calculateDeterministicScore(
            profile,
            jobProfile.title,
            jobProfile.requirements,
            jobProfile.location,
            jobProfile.work_type,
            jobProfile.employment_type,
            jobProfile.description
          );

          const finalScore = combineScores(breakdown.total, aiMatch.match_score);
          const canon = canonicalUrl(result.url);

          const job = await prisma.job.upsert({
            where: { canonicalUrl: canon },
            create: {
              title: jobProfile.title,
              company: jobProfile.company,
              location: jobProfile.location,
              workType: jobProfile.work_type,
              employmentType: jobProfile.employment_type,
              salaryMin: jobProfile.salary_min,
              salaryMax: jobProfile.salary_max,
              currency: jobProfile.currency,
              description: jobProfile.description,
              requirements: jobProfile.requirements ?? [],
              jobUrl: jobProfile.job_url,
              canonicalUrl: canon,
            },
            update: {
              lastVerifiedAt: new Date(),
            },
          });

          await prisma.jobMatch.upsert({
            where: { resumeId_jobId: { resumeId, jobId: job.id } },
            create: {
              resumeId,
              jobId: job.id,
              matchScore: finalScore,
              matchedSkills: aiMatch.matched_skills.length ? aiMatch.matched_skills : matchedSkills,
              missingRequiredSkills: aiMatch.missing_required_skills ?? [],
              missingPreferredSkills: aiMatch.missing_preferred_skills ?? [],
              experienceCompatibility: aiMatch.experience_compatibility,
              aiExplanation: aiMatch.reason,
              scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue,
            },
            update: {
              matchScore: finalScore,
              matchedSkills: aiMatch.matched_skills.length ? aiMatch.matched_skills : matchedSkills,
              missingRequiredSkills: aiMatch.missing_required_skills ?? [],
              missingPreferredSkills: aiMatch.missing_preferred_skills ?? [],
              experienceCompatibility: aiMatch.experience_compatibility,
              aiExplanation: aiMatch.reason,
              scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue,
            },
          });

          matches.push({
            id: job.id,
            ...jobProfile,
            match_score: finalScore,
            matched_skills: aiMatch.matched_skills.length ? aiMatch.matched_skills : matchedSkills,
            missing_required_skills: aiMatch.missing_required_skills,
            missing_preferred_skills: aiMatch.missing_preferred_skills,
            experience_compatibility: aiMatch.experience_compatibility,
            ai_explanation: aiMatch.reason,
            score_breakdown: breakdown,
          });

          return; // Success, exit retry loop
        } catch (err) {
          console.error(`Attempt ${attempt} failed for job "${result.title}":`, err);
          if (attempt === 2) {
            console.error(`Giving up on job "${result.title}" after 2 attempts.`);
          }
        }
      }
    }

    // Run in batches of CONCURRENCY
    for (let i = 0; i < queue.length; i += CONCURRENCY) {
      const batch = queue.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(processJob));
    }

    await updateStep('ranking', 'ranking');
    await prisma.searchRun.update({
      where: { id: searchRunId },
      data: {
        status: 'completed',
        currentStep: 'ranking',
        resultsFound: matches.length,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await prisma.searchRun.update({
      where: { id: searchRunId },
      data: {
        status: 'failed',
        error: message,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function getSearchResults(resumeId: string): Promise<{
  profile: CandidateProfile | null;
  jobs: JobWithMatch[];
  searchRun: { status: string; currentStep: string | null; resultsFound: number; error: string | null };
}> {
  const profileRecord = await prisma.candidateProfile.findUnique({ where: { resumeId } });
  const searchRun = await prisma.searchRun.findFirst({
    where: { resumeId },
    orderBy: { startedAt: 'desc' },
  });

  const matches = await prisma.jobMatch.findMany({
    where: { resumeId },
    include: { job: true },
    orderBy: { matchScore: 'desc' },
    take: config.topResults,
  });

  const profile: CandidateProfile | null = profileRecord
    ? {
        job_titles: profileRecord.jobTitles as string[],
        skills: profileRecord.skills as string[],
        inferred_skills: profileRecord.inferredSkills as string[],
        experience_level: profileRecord.experienceLevel,
        education: profileRecord.education as string[],
        locations: profileRecord.locations as string[],
        preferences: profileRecord.preferences as Record<string, unknown>,
      }
    : null;

  const jobs: JobWithMatch[] = matches.map((match) => ({
    id: match.job.id,
    title: match.job.title,
    company: match.job.company,
    location: match.job.location,
    work_type: match.job.workType,
    employment_type: match.job.employmentType,
    salary_min: match.job.salaryMin,
    salary_max: match.job.salaryMax,
    currency: match.job.currency,
    description: match.job.description,
    requirements: match.job.requirements as string[],
    job_url: match.job.jobUrl,
    source_name: 'Web',
    posted_at: match.job.postedAt?.toISOString() ?? null,
    match_score: match.matchScore,
    matched_skills: match.matchedSkills as string[],
    missing_required_skills: match.missingRequiredSkills as string[],
    missing_preferred_skills: match.missingPreferredSkills as string[],
    experience_compatibility: match.experienceCompatibility,
    ai_explanation: match.aiExplanation,
    score_breakdown: match.scoreBreakdown as JobWithMatch['score_breakdown'],
  }));

  return {
    profile,
    jobs,
    searchRun: {
      status: searchRun?.status ?? 'pending',
      currentStep: searchRun?.currentStep ?? null,
      resultsFound: searchRun?.resultsFound ?? 0,
      error: searchRun?.error ?? null,
    },
  };
}
