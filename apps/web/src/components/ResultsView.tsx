import { useState } from 'react';
import { ArrowLeft, Sparkles, SlidersHorizontal, Briefcase, Award, MapPin } from 'lucide-react';
import type { JobResult } from '../services/api';
import { JobCard } from './JobCard';

interface Profile {
  job_titles: string[];
  skills: string[];
  experience_level: string;
  education: string[];
  locations: string[];
}

interface Props {
  jobs: JobResult[];
  profile: Profile | null;
  onReset: () => void;
}

export function ResultsView({ jobs, profile, onReset }: Props) {
  const [minMatch, setMinMatch] = useState(0);
  const [sortBy, setSortBy] = useState<'match' | 'title'>('match');

  const filtered = jobs
    .filter((j) => j.match_score >= minMatch)
    .sort((a, b) =>
      sortBy === 'match'
        ? b.match_score - a.match_score
        : a.title.localeCompare(b.title)
    );

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-lg shadow-indigo-500/20">
              <img src="/radar.svg" alt="ResumeRadar" className="w-6 h-6 invert" />
            </div>
            <span className="text-2xl font-bold font-heading bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ResumeRadar
            </span>
          </div>

          <button
            onClick={onReset}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-4 py-2 rounded-xl border border-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            Upload New Resume
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Title Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Web Radar Match Complete
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
              Jobs Found For Your Resume
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Discovered <span className="font-semibold text-indigo-400">{filtered.length}</span> relevant job post{filtered.length !== 1 ? 's' : ''} ranked by AI match score
            </p>
          </div>
        </div>

        {/* Candidate Profile Summary */}
        {profile && (
          <div className="glass-panel rounded-2xl p-6 mb-8 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -z-10" />
            
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Extracted Candidate Profile
              </div>
              <span className="text-xs text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-medium">
                {profile.experience_level}
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                  Target Roles
                </p>
                <p className="text-slate-200 font-semibold">
                  {profile.job_titles.slice(0, 3).join(', ')}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Preferred Locations
                </p>
                <p className="text-slate-200 font-semibold">
                  {profile.locations.join(', ') || 'Remote / Philippines'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                  <Award className="w-3.5 h-3.5 text-indigo-400" /> Education
                </p>
                <p className="text-slate-200 font-semibold truncate">
                  {profile.education[0] || 'Higher Education'}
                </p>
              </div>

              <div className="md:col-span-3">
                <p className="text-xs text-slate-400 mb-2 font-medium">Extracted Skills</p>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 bg-indigo-950/70 border border-indigo-500/30 text-indigo-200 rounded-lg text-xs font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-3 glass-card rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400 ml-2" />
            <span className="text-xs text-slate-400 font-medium mr-2">Filter:</span>
            {[0, 75, 90].map((threshold) => (
              <button
                key={threshold}
                onClick={() => setMinMatch(threshold)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  minMatch === threshold
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {threshold === 0 ? 'All Matches' : `${threshold}%+ Fit`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'match' | 'title')}
              className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="match">Best Match Score</option>
              <option value="title">Job Title A–Z</option>
            </select>
          </div>
        </div>

        {/* Results List */}
        {filtered.length === 0 ? (
          <div className="glass-panel text-center py-20 rounded-2xl border border-slate-800 text-slate-400">
            <p className="text-lg font-semibold text-slate-300 mb-2">No matches found for this filter</p>
            <p className="text-xs text-slate-500">Try lowering the minimum match threshold above to view all discovered jobs.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

