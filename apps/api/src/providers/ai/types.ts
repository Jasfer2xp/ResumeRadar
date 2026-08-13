import type { CandidateProfile, JobMatchAnalysis, JobProfile } from '@resumeradar/shared';

export interface ResumeInput {
  text: string;
  filename: string;
}

export interface JobInput {
  title: string;
  snippet: string;
  url: string;
}

export interface AIProvider {
  analyzeResume(input: ResumeInput): Promise<CandidateProfile>;
  analyzeJob(input: JobInput): Promise<Partial<JobProfile>>;
  matchJob(candidate: CandidateProfile, job: JobProfile): Promise<JobMatchAnalysis>;
}
