const API_BASE = '/api';

export interface UploadResponse {
  id: string;
  filename: string;
  fileType: string;
  createdAt: string;
}

export interface SearchStartResponse {
  searchRunId: string;
  resumeId: string;
  status: string;
}

export interface SearchStatusResponse {
  id: string;
  resumeId: string;
  status: string;
  currentStep: string | null;
  resultsFound: number;
  error: string | null;
  steps: Array<{ id: string; label: string; status: string }>;
  completedAt: string | null;
}

export interface JobResult {
  id: string;
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
  match_score: number;
  matched_skills: string[];
  missing_required_skills: string[];
  missing_preferred_skills: string[];
  experience_compatibility: string | null;
  ai_explanation: string | null;
}

export interface SearchResultsResponse {
  profile: {
    job_titles: string[];
    skills: string[];
    experience_level: string;
    education: string[];
    locations: string[];
  } | null;
  jobs: JobResult[];
  searchRun: {
    status: string;
    currentStep: string | null;
    resultsFound: number;
    error: string | null;
  };
}

export async function uploadResume(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch(`${API_BASE}/resumes`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Upload failed');
  }

  return res.json();
}

export async function startSearch(resumeId: string): Promise<SearchStartResponse> {
  const res = await fetch(`${API_BASE}/search/resume/${resumeId}`, {
    method: 'POST',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Failed to start search');
  }

  return res.json();
}

export async function getSearchStatus(searchRunId: string): Promise<SearchStatusResponse> {
  const res = await fetch(`${API_BASE}/search/${searchRunId}/status`);
  if (!res.ok) throw new Error('Failed to get search status');
  return res.json();
}

export async function getSearchResults(resumeId: string): Promise<SearchResultsResponse> {
  const res = await fetch(`${API_BASE}/search/resume/${resumeId}/results`);
  if (!res.ok) throw new Error('Failed to get results');
  return res.json();
}
