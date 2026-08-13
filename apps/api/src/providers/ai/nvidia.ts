import type { CandidateProfile, JobMatchAnalysis, JobProfile } from '@resumeradar/shared';
import { config } from '../../config.js';
import type { AIProvider, JobInput, ResumeInput } from './types.js';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

/** Standard non-streaming call — used for resume analysis (inkling). */
async function callNvidia(
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature = 0.2,
  timeoutMs = 90000
): Promise<string> {
  if (!config.nvidiaApiKey) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }

  const response = await fetch(NVIDIA_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.nvidiaApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 4096,
      stream: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? '';
}

/**
 * Non-streaming call for Nemotron reasoning models.
 *
 * Uses a strict JSON-only prefix in the system prompt to prevent Nemotron from
 * outputting verbose reasoning preambles instead of the requested JSON object.
 */
async function callNvidiaReasoning(
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature = 0.3
): Promise<string> {
  // Inject the no-reasoning prefix into the system message
  const augmented = messages.map((m, i) =>
    i === 0 && m.role === 'system'
      ? { ...m, content: NEMOTRON_JSON_PREFIX + m.content }
      : m
  );
  return callNvidia(model, augmented, temperature);
}

/**
 * Nemotron-specific system prompt prefix that suppresses its verbose reasoning preamble.
 * Without this, the model often outputs 2000+ tokens of "Here's a thinking process: ..."
 * before (or instead of) the requested JSON.
 */
const NEMOTRON_JSON_PREFIX = `IMPORTANT: Output ONLY the raw JSON object. Do NOT include any explanation, reasoning, preamble, markdown code fences, or any text outside the JSON object. Start your response with '{' and end with '}'.\n\n`;

function extractJson(text: string): unknown {
  // 1. Try code fence: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* fall through */ }
  }

  // 2. Try the raw text directly (model obeyed prompt)
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* fall through */ }

  // 3. Scan for outermost JSON object anywhere in the text
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { /* fall through */ }
  }

  throw new Error('Failed to parse JSON from AI response');
}

const RESUME_ANALYSIS_PROMPT = `You are a resume analysis expert. Analyze the resume text and extract a structured candidate profile.

CRITICAL RULES:
- Only include skills EXPLICITLY stated in the resume under "skills".
- Do NOT invent or assume skills not mentioned (e.g., do not add Laravel if only PHP is mentioned).
- Put any reasonably inferred skills in "inferred_skills" separately, and only if strongly supported by context.
- Do not fabricate education, experience, or job titles.
- Infer experience level from actual work history (Entry Level, Junior, Mid Level, Senior).

Return ONLY valid JSON with this exact structure:
{
  "job_titles": ["array of suitable job titles based on resume"],
  "skills": ["only explicitly stated skills"],
  "inferred_skills": ["skills reasonably inferred from context, if any"],
  "experience_level": "Entry Level | Junior | Mid Level | Senior",
  "education": ["degrees and certifications mentioned"],
  "locations": ["locations mentioned or implied, default to Philippines if none"]
}`;

const JOB_ANALYSIS_PROMPT = `Analyze this job posting snippet and extract structured job information.

RULES:
- Do not fabricate salary, dates, or requirements not present in the text.
- Use null for unknown fields.
- Extract requirements only if clearly stated.

Return ONLY valid JSON:
{
  "title": "job title",
  "company": "company name or null",
  "location": "location or null",
  "work_type": "Remote | Hybrid | Onsite | null",
  "employment_type": "Full-time | Part-time | Contract | null",
  "salary_min": null,
  "salary_max": null,
  "currency": null,
  "description": "brief description from snippet",
  "requirements": ["list of stated requirements/skills"],
  "posted_at": null
}`;

const MATCH_PROMPT = `Compare the candidate profile with the job profile and provide match analysis.

RULES:
- Be honest about gaps. Do not guarantee the candidate will be hired.
- match_score should be 0-100 based on actual fit.
- Separate required vs preferred missing skills when possible.
- Only match skills the candidate actually has.

Return ONLY valid JSON:
{
  "match_score": 0-100,
  "matched_skills": ["skills candidate has that job needs"],
  "missing_required_skills": ["required skills candidate lacks"],
  "missing_preferred_skills": ["nice-to-have skills candidate lacks"],
  "experience_compatibility": "Strong match | Potentially suitable | Experience mismatch",
  "reason": "Brief explanation of the match"
}`;

export class NVIDIAProvider implements AIProvider {
  private readonly useReasoning: boolean;

  constructor() {
    // Use reasoning model (Nemotron) if configured, otherwise fall back to standard model
    this.useReasoning = !!config.nvidiaReasonModel;
    if (this.useReasoning) {
      console.log(`[AI] Using reasoning model: ${config.nvidiaReasonModel} (Nemotron)`);
    }
  }

  async analyzeResume(input: ResumeInput): Promise<CandidateProfile> {
    // Resume analysis always uses the dedicated inkling model (best for structured extraction)
    const content = await callNvidia(config.nvidiaResumeModel, [
      { role: 'system', content: RESUME_ANALYSIS_PROMPT },
      {
        role: 'user',
        content: `Resume filename: ${input.filename}\n\nResume text:\n${input.text.slice(0, 12000)}`,
      },
    ]);

    const parsed = extractJson(content) as CandidateProfile;
    return {
      job_titles: parsed.job_titles ?? [],
      skills: parsed.skills ?? [],
      inferred_skills: parsed.inferred_skills ?? [],
      experience_level: parsed.experience_level ?? 'Entry Level',
      education: parsed.education ?? [],
      locations: parsed.locations?.length ? parsed.locations : ['Philippines'],
      preferences: parsed.preferences ?? {},
    };
  }

  async analyzeJob(input: JobInput): Promise<Partial<JobProfile>> {
    const userMsg = `Title: ${input.title}\nURL: ${input.url}\n\nSnippet:\n${input.snippet.slice(0, 4000)}`;

    const content = this.useReasoning
      ? await callNvidiaReasoning(
          config.nvidiaReasonModel!,
          [{ role: 'system', content: JOB_ANALYSIS_PROMPT }, { role: 'user', content: userMsg }],
          0.3
        )
      : await callNvidia(
          config.nvidiaMatchModel,
          [{ role: 'system', content: JOB_ANALYSIS_PROMPT }, { role: 'user', content: userMsg }],
          0.1
        );

    return extractJson(content) as Partial<JobProfile>;
  }

  async matchJob(candidate: CandidateProfile, job: JobProfile): Promise<JobMatchAnalysis> {
    const userMsg = `Candidate Profile:\n${JSON.stringify(candidate, null, 2)}\n\nJob Profile:\n${JSON.stringify(job, null, 2)}`;

    const content = this.useReasoning
      ? await callNvidiaReasoning(
          config.nvidiaReasonModel!,
          [{ role: 'system', content: MATCH_PROMPT }, { role: 'user', content: userMsg }],
          0.3
        )
      : await callNvidia(
          config.nvidiaMatchModel,
          [{ role: 'system', content: MATCH_PROMPT }, { role: 'user', content: userMsg }],
          0.2
        );

    const parsed = extractJson(content) as JobMatchAnalysis;
    return {
      match_score: Math.min(100, Math.max(0, parsed.match_score ?? 0)),
      matched_skills: parsed.matched_skills ?? [],
      missing_required_skills: parsed.missing_required_skills ?? [],
      missing_preferred_skills: parsed.missing_preferred_skills ?? [],
      experience_compatibility: parsed.experience_compatibility ?? 'Potentially suitable',
      reason: parsed.reason ?? '',
    };
  }
}

export function createMockCandidateProfile(text: string): CandidateProfile {
  const skills: string[] = [];
  const skillPatterns = [
    'PHP', 'Laravel', 'MySQL', 'JavaScript', 'HTML', 'CSS', 'Git',
    'Python', 'Java', 'React', 'Node.js', 'TypeScript', 'SQL',
  ];
  const upperText = text.toUpperCase();
  for (const skill of skillPatterns) {
    if (upperText.includes(skill.toUpperCase())) {
      skills.push(skill);
    }
  }

  let experienceLevel = 'Entry Level';
  if (/senior|sr\./i.test(text)) experienceLevel = 'Senior';
  else if (/mid[- ]?level|intermediate/i.test(text)) experienceLevel = 'Mid Level';
  else if (/junior|jr\./i.test(text)) experienceLevel = 'Junior';

  const education: string[] = [];
  const eduMatch = text.match(/bachelor[^.\n]*/i);
  if (eduMatch) education.push(eduMatch[0].trim());

  const jobTitles: string[] = [];
  if (skills.includes('PHP') || skills.includes('Laravel')) {
    jobTitles.push('PHP Developer', 'Laravel Developer', 'Junior Web Developer');
  }
  if (skills.includes('JavaScript')) {
    jobTitles.push('Web Developer', 'Junior Full Stack Developer');
  }
  if (jobTitles.length === 0) {
    jobTitles.push('Software Developer', 'IT Professional');
  }

  return {
    job_titles: [...new Set(jobTitles)],
    skills,
    inferred_skills: [],
    experience_level: experienceLevel,
    education,
    locations: ['Philippines'],
    preferences: {},
  };
}

export class MockAIProvider implements AIProvider {
  async analyzeResume(input: ResumeInput): Promise<CandidateProfile> {
    return createMockCandidateProfile(input.text);
  }

  async analyzeJob(input: JobInput): Promise<Partial<JobProfile>> {
    return {
      title: input.title,
      company: null,
      location: null,
      work_type: input.snippet.toLowerCase().includes('remote') ? 'Remote' : null,
      employment_type: 'Full-time',
      salary_min: null,
      salary_max: null,
      currency: null,
      description: input.snippet,
      requirements: [],
      posted_at: null,
    };
  }

  async matchJob(candidate: CandidateProfile, job: JobProfile): Promise<JobMatchAnalysis> {
    const allSkills = [...candidate.skills, ...candidate.inferred_skills];
    const matched = job.requirements.filter((r) =>
      allSkills.some((s) => s.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(s.toLowerCase()))
    );
    const missing = job.requirements.filter((r) => !matched.includes(r));
    const score = job.requirements.length > 0
      ? Math.round((matched.length / job.requirements.length) * 100)
      : 70;

    return {
      match_score: score,
      matched_skills: matched,
      missing_required_skills: missing.slice(0, 3),
      missing_preferred_skills: missing.slice(3),
      experience_compatibility: score >= 70 ? 'Strong match' : 'Potentially suitable',
      reason: `Candidate matches ${matched.length} of ${job.requirements.length || 'several'} listed requirements.`,
    };
  }
}

export function createAIProvider(): AIProvider {
  if (config.nvidiaApiKey) {
    return new NVIDIAProvider();
  }
  console.warn('[AI] NVIDIA_API_KEY not set — using mock AI provider for development');
  return new MockAIProvider();
}

