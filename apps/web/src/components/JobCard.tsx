import { ExternalLink, MapPin, CheckCircle2, AlertCircle, Building2, DollarSign } from 'lucide-react';
import type { JobResult } from '../services/api';

interface Props {
  job: JobResult;
}

function MatchBadge({ score }: { score: number }) {
  const roundScore = Math.round(score);
  const color =
    roundScore >= 90
      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
      : roundScore >= 75
        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40 shadow-indigo-500/10'
        : roundScore >= 60
          ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-amber-500/10'
          : 'bg-slate-900 text-slate-400 border-slate-800';

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border shadow-md ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {roundScore}% Match
    </div>
  );
}

function formatSalary(min: number | null, max: number | null, currency: string | null) {
  if (!min && !max) return null;
  const sym = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : '';
  if (min && max) return `${sym}${min.toLocaleString()} – ${sym}${max.toLocaleString()}`;
  if (min) return `${sym}${min.toLocaleString()}+`;
  return null;
}

export function JobCard({ job }: Props) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  const gaps = [...job.missing_required_skills, ...job.missing_preferred_skills];

  return (
    <article className="glass-card rounded-2xl p-6 border border-slate-800/90 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/10 group">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div>
          <MatchBadge score={job.match_score} />
          <h3 className="text-xl font-bold font-heading text-white mt-3 group-hover:text-indigo-300 transition-colors">
            {job.title}
          </h3>
          {job.company && (
            <p className="text-slate-300 text-sm flex items-center gap-1.5 mt-1 font-medium">
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
              {job.company}
            </p>
          )}
        </div>

        <a
          href={job.job_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all shrink-0 self-start"
        >
          View Job
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Badges bar */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-5 pb-4 border-b border-slate-800/80">
        {(job.location || job.work_type) && (
          <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            {[job.work_type, job.location].filter(Boolean).join(' · ')}
          </span>
        )}
        {salary && (
          <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800 text-emerald-400 font-semibold">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> {salary}
          </span>
        )}
        {job.employment_type && (
          <span className="bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800 text-slate-300 font-medium">
            {job.employment_type}
          </span>
        )}
      </div>

      {/* Matched Skills */}
      {job.matched_skills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Matched Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {job.matched_skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold"
              >
                ✓ {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Potential Gaps */}
      {gaps.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Potential Gaps / Preferred Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {gaps.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-950/70 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-medium"
              >
                ⚠ {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Explanation */}
      {job.ai_explanation && (
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed mb-4">
          <span className="font-semibold text-indigo-300">NVIDIA AI Match Reasoning: </span>
          {job.ai_explanation}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span>Source: <strong className="text-slate-400">{job.source_name}</strong></span>
        <a
          href={job.job_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-semibold"
        >
          Direct original application link &rarr;
        </a>
      </div>
    </article>
  );
}

