import type { CandidateProfile, MatchWeights, ScoreBreakdown } from './types.js';
import { DEFAULT_MATCH_WEIGHTS as weights } from './types.js';

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim();
}

function skillsOverlap(candidateSkills: string[], jobSkills: string[]): string[] {
  const normalized = candidateSkills.map(normalizeSkill);
  return jobSkills.filter((s) =>
    normalized.some(
      (cs) => cs.includes(normalizeSkill(s)) || normalizeSkill(s).includes(cs)
    )
  );
}

function scoreSkills(
  candidate: CandidateProfile,
  jobRequirements: string[],
  maxScore: number
): { score: number; matched: string[] } {
  const allSkills = [...candidate.skills, ...candidate.inferred_skills];
  const matched = skillsOverlap(allSkills, jobRequirements);
  if (jobRequirements.length === 0) {
    return { score: maxScore * 0.5, matched };
  }
  const ratio = matched.length / jobRequirements.length;
  return { score: Math.min(maxScore, ratio * maxScore), matched };
}

const EXPERIENCE_LEVELS: Record<string, number> = {
  'entry level': 1,
  entry: 1,
  junior: 2,
  'mid level': 3,
  mid: 3,
  senior: 4,
  lead: 5,
  principal: 6,
};

function parseExperienceLevel(level: string): number {
  const normalized = level.toLowerCase();
  for (const [key, value] of Object.entries(EXPERIENCE_LEVELS)) {
    if (normalized.includes(key)) return value;
  }
  return 2;
}

function scoreExperience(
  candidateLevel: string,
  jobTitle: string,
  jobDescription: string | null,
  maxScore: number
): number {
  const candidateExp = parseExperienceLevel(candidateLevel);
  const text = `${jobTitle} ${jobDescription ?? ''}`.toLowerCase();

  let requiredExp = 2;
  if (text.includes('senior') || text.includes('sr.')) requiredExp = 4;
  else if (text.includes('lead') || text.includes('principal')) requiredExp = 5;
  else if (text.includes('mid') || text.includes('intermediate')) requiredExp = 3;
  else if (text.includes('entry') || text.includes('junior') || text.includes('jr')) requiredExp = 1;

  const diff = Math.abs(candidateExp - requiredExp);
  if (diff === 0) return maxScore;
  if (diff === 1) return maxScore * 0.75;
  if (diff === 2) return maxScore * 0.4;
  return maxScore * 0.15;
}

function scoreTitleAlignment(
  candidateTitles: string[],
  jobTitle: string,
  maxScore: number
): number {
  const normalizedJob = jobTitle.toLowerCase();
  let best = 0;
  for (const title of candidateTitles) {
    const normalized = title.toLowerCase();
    const jobWords = normalizedJob.split(/\s+/);
    const titleWords = normalized.split(/\s+/);
    const overlap = titleWords.filter((w) => jobWords.includes(w)).length;
    const ratio = overlap / Math.max(titleWords.length, 1);
    best = Math.max(best, ratio);
  }
  return best * maxScore;
}

function scoreEducation(
  candidateEducation: string[],
  jobDescription: string | null,
  maxScore: number
): number {
  if (candidateEducation.length === 0) return maxScore * 0.3;
  const desc = (jobDescription ?? '').toLowerCase();
  if (!desc.includes('bachelor') && !desc.includes('degree') && !desc.includes('education')) {
    return maxScore;
  }
  const hasDegree = candidateEducation.some(
    (e) =>
      e.toLowerCase().includes('bachelor') ||
      e.toLowerCase().includes('master') ||
      e.toLowerCase().includes('degree')
  );
  return hasDegree ? maxScore : maxScore * 0.3;
}

function scoreLocation(
  candidateLocations: string[],
  jobLocation: string | null,
  maxScore: number
): number {
  if (!jobLocation) return maxScore * 0.7;
  const jobLoc = jobLocation.toLowerCase();
  if (jobLoc.includes('remote')) return maxScore;
  if (candidateLocations.length === 0) return maxScore * 0.5;
  const match = candidateLocations.some((loc) =>
    jobLoc.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLoc.split(',')[0].trim())
  );
  return match ? maxScore : maxScore * 0.2;
}

function scoreWorkType(
  preferences: Record<string, unknown> | undefined,
  jobWorkType: string | null,
  maxScore: number
): number {
  if (!jobWorkType) return maxScore * 0.7;
  const prefRemote = preferences?.remote === true;
  if (prefRemote && jobWorkType.toLowerCase().includes('remote')) return maxScore;
  return maxScore * 0.8;
}

function scoreEmploymentType(
  jobEmploymentType: string | null,
  maxScore: number
): number {
  if (!jobEmploymentType) return maxScore * 0.7;
  return maxScore * 0.9;
}

export function calculateDeterministicScore(
  candidate: CandidateProfile,
  jobTitle: string,
  jobRequirements: string[],
  jobLocation: string | null,
  jobWorkType: string | null,
  jobEmploymentType: string | null,
  jobDescription: string | null,
  matchWeights: MatchWeights = weights
): { breakdown: ScoreBreakdown; matchedSkills: string[] } {
  const { score: skillsScore, matched } = scoreSkills(
    candidate,
    jobRequirements,
    matchWeights.skills
  );
  const experienceScore = scoreExperience(
    candidate.experience_level,
    jobTitle,
    jobDescription,
    matchWeights.experience
  );
  const titleScore = scoreTitleAlignment(candidate.job_titles, jobTitle, matchWeights.title);
  const educationScore = scoreEducation(candidate.education, jobDescription, matchWeights.education);
  const locationScore = scoreLocation(candidate.locations, jobLocation, matchWeights.location);
  const workTypeScore = scoreWorkType(candidate.preferences, jobWorkType, matchWeights.workType);
  const employmentTypeScore = scoreEmploymentType(jobEmploymentType, matchWeights.employmentType);

  const breakdown: ScoreBreakdown = {
    skills: Math.round(skillsScore * 10) / 10,
    experience: Math.round(experienceScore * 10) / 10,
    title: Math.round(titleScore * 10) / 10,
    education: Math.round(educationScore * 10) / 10,
    location: Math.round(locationScore * 10) / 10,
    workType: Math.round(workTypeScore * 10) / 10,
    employmentType: Math.round(employmentTypeScore * 10) / 10,
    total: 0,
  };
  breakdown.total =
    Math.round(
      (breakdown.skills +
        breakdown.experience +
        breakdown.title +
        breakdown.education +
        breakdown.location +
        breakdown.workType +
        breakdown.employmentType) *
        10
    ) / 10;

  return { breakdown, matchedSkills: matched };
}

export function combineScores(
  deterministicScore: number,
  aiScore: number
): number {
  return Math.round(deterministicScore * 0.6 + aiScore * 0.4);
}

export function generateSearchQueries(profile: CandidateProfile): string[] {
  const queries = new Set<string>();
  const locations =
    profile.locations.length > 0 ? profile.locations : ['Philippines', 'Remote'];

  for (const title of profile.job_titles.slice(0, 5)) {
    for (const loc of locations.slice(0, 3)) {
      queries.add(`"${title}" ${loc} job posting apply`);
      queries.add(`"${title}" ${loc} hiring site:linkedin.com/jobs/view`);
    }
  }

  const skills = profile.skills.slice(0, 5);
  if (skills.length >= 2) {
    queries.add(`${skills.slice(0, 3).join(' ')} developer job ${locations[0]}`);
  }

  const level = profile.experience_level.toLowerCase();
  if (level.includes('entry') || level.includes('junior')) {
    for (const title of profile.job_titles.slice(0, 3)) {
      queries.add(`"Junior ${title.replace(/junior\s*/i, '')}" ${locations[0]}`);
      queries.add(`"Entry Level ${title}" ${locations[0]}`);
    }
  }

  return [...queries].slice(0, 10);
}

export function deduplicateSearchResults<T extends { url: string; title: string }>(
  results: T[]
): T[] {
  const seen = new Map<string, T>();

  for (const result of results) {
    let canonical: string;
    try {
      const parsed = new URL(result.url);
      canonical = `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, '');
    } catch {
      canonical = result.url.toLowerCase();
    }

    const titleKey = result.title.toLowerCase().replace(/\s+/g, ' ').trim();
    const key = `${canonical}|${titleKey}`;

    if (!seen.has(key)) {
      seen.set(key, result);
    }
  }

  return [...seen.values()];
}

export function isIndividualJobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const full = url.toLowerCase();
    const segments = path.split('/').filter(Boolean);

    const rejectPatterns = [
      '/search',
      '?q=',
      '/results',
      '/jobs/search',
      'search?',
      '/jobs#',
      '/remote-jobs$',
      '/remote-.*-jobs$',
      'freelancer.com/jobs/',
      'indeed.com/jobs?',
      'glassdoor.com/job/jobs',
      'linkedin.com/jobs/search',
      'linkedin.com/jobs/collections',
      'linkedin.com/jobs/?',
    ];
    if (rejectPatterns.some((pattern) => {
      if (pattern.startsWith('/') && pattern.endsWith('$')) {
        return new RegExp(`${pattern.replace(/\$/g, '')}$`).test(path);
      }
      return full.includes(pattern);
    })) {
      return false;
    }

    if (segments.length === 0) return false;
    if (
      segments.length === 1 &&
      ['jobs', 'careers', 'job-board', 'remote-jobs', 'php', 'laravel'].includes(segments[0])
    ) {
      return false;
    }

    const jobPatterns = [
      '/jobs/view/',
      '/job/',
      '/careers/job/',
      '/position/',
      '/vacancy/',
      '/opening/',
      '/job-board/',
      '/remote-jobs/remote-',
      '/apply/',
    ];
    if (jobPatterns.some((pattern) => path.includes(pattern))) return true;

    return /\d{5,}/.test(path);
  } catch {
    return false;
  }
}

export function filterIndividualJobResults<T extends { url: string }>(results: T[]): T[] {
  return results.filter((result) => isIndividualJobUrl(result.url));
}

export function prioritizeJobResults<T extends { url: string }>(results: T[]): T[] {
  return [...results].sort((a, b) => {
    const aScore = isIndividualJobUrl(a.url) ? 1 : 0;
    const bScore = isIndividualJobUrl(b.url) ? 1 : 0;
    return bScore - aScore;
  });
}
