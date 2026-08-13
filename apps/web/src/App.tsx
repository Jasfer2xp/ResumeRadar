import { useCallback, useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { ProcessingView } from './components/ProcessingView';
import { ResultsView } from './components/ResultsView';
import {
  uploadResume,
  startSearch,
  getSearchStatus,
  getSearchResults,
  type JobResult,
} from './services/api';
import { SEARCH_PROGRESS_STEPS } from '@resumeradar/shared';

type AppState = 'landing' | 'processing' | 'results' | 'error';

export default function App() {
  const [state, setState] = useState<AppState>('landing');
  const [loading, setLoading] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [searchRunId, setSearchRunId] = useState<string | null>(null);
  const [steps, setSteps] = useState(
    SEARCH_PROGRESS_STEPS.map((s) => ({ ...s, status: 'pending' }))
  );
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [candidateProfile, setCandidateProfile] = useState<{
    job_titles: string[];
    skills: string[];
    experience_level: string;
    education: string[];
    locations: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(async (runId: string, resId: string) => {
    try {
      const status = await getSearchStatus(runId);
      setSteps(status.steps);

      if (status.status === 'completed') {
        const results = await getSearchResults(resId);
        setJobs(results.jobs);
        setCandidateProfile(results.profile);
        setState('results');
        return true;
      }

      if (status.status === 'failed') {
        setError(status.error ?? 'Search failed');
        setState('error');
        return true;
      }

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status check failed');
      setState('error');
      return true;
    }
  }, []);

  useEffect(() => {
    if (!searchRunId || !resumeId || state !== 'processing') return;

    const interval = setInterval(async () => {
      const done = await pollStatus(searchRunId, resumeId);
      if (done) clearInterval(interval);
    }, 2000);

    pollStatus(searchRunId, resumeId);

    return () => clearInterval(interval);
  }, [searchRunId, resumeId, state, pollStatus]);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const upload = await uploadResume(file);
      setResumeId(upload.id);

      setSteps(
        SEARCH_PROGRESS_STEPS.map((s, i) => ({
          ...s,
          status: i === 0 ? 'completed' : 'pending',
        }))
      );
      setState('processing');

      const search = await startSearch(upload.id);
      setSearchRunId(search.searchRunId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('landing');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setState('landing');
    setResumeId(null);
    setSearchRunId(null);
    setJobs([]);
    setCandidateProfile(null);
    setError(null);
    setSteps(SEARCH_PROGRESS_STEPS.map((s) => ({ ...s, status: 'pending' })));
  };

  if (state === 'processing' || state === 'error') {
    return <ProcessingView steps={steps} error={error} />;
  }

  if (state === 'results') {
    return (
      <ResultsView
        jobs={jobs}
        profile={candidateProfile}
        onReset={handleReset}
      />
    );
  }

  return <LandingPage onUpload={handleUpload} loading={loading} />;
}
