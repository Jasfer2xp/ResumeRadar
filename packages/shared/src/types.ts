export interface CandidateProfile {
  job_titles: string[];
  skills: string[];
  inferred_skills: string[];
  experience_level: string;
  education: string[];
  locations: string[];
  preferences?: Record<string, unknown>;
}

export interface JobProfile {
  title: string;
  company: string | null;
  location: string | null;
  work_type: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  description: string | null;
  requirements: string[];
  job_url: string;
  source_name: string;
  posted_at: string | null;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  company?: string;
}

export interface JobMatchAnalysis {
  match_score: number;
  matched_skills: string[];
  missing_required_skills: string[];
  missing_preferred_skills: string[];
  experience_compatibility: string;
  reason: string;
}

export interface ScoreBreakdown {
  skills: number;
  experience: number;
  title: number;
  education: number;
  location: number;
  workType: number;
  employmentType: number;
  total: number;
}

export interface MatchWeights {
  skills: number;
  experience: number;
  title: number;
  education: number;
  location: number;
  workType: number;
  employmentType: number;
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  skills: 40,
  experience: 20,
  title: 15,
  education: 10,
  location: 5,
  workType: 5,
  employmentType: 5,
};

export type SearchRunStatus =
  | 'pending'
  | 'extracting'
  | 'analyzing'
  | 'generating_queries'
  | 'searching'
  | 'normalizing'
  | 'matching'
  | 'ranking'
  | 'completed'
  | 'failed';

export interface SearchProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export const SEARCH_PROGRESS_STEPS: Omit<SearchProgressStep, 'status'>[] = [
  { id: 'uploaded', label: 'Resume uploaded' },
  { id: 'extracting', label: 'Extracting resume' },
  { id: 'understanding', label: 'Understanding your skills' },
  { id: 'job_titles', label: 'Finding suitable job titles' },
  { id: 'searching', label: 'Searching the web' },
  { id: 'analyzing_jobs', label: 'Analyzing discovered jobs' },
  { id: 'ranking', label: 'Ranking your best matches' },
];

export interface JobWithMatch extends JobProfile {
  id: string;
  match_score: number;
  matched_skills: string[];
  missing_required_skills: string[];
  missing_preferred_skills: string[];
  experience_compatibility: string | null;
  ai_explanation: string | null;
  score_breakdown: ScoreBreakdown | null;
}
