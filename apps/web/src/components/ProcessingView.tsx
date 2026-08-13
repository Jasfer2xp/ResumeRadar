import { CheckCircle2, Circle, Loader2, XCircle, Radar } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  status: string;
}

interface Props {
  steps: Step[];
  error?: string | null;
}

function StepIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
    case 'in_progress':
      return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
    default:
      return <Circle className="w-5 h-5 text-slate-700 shrink-0" />;
  }
}

export function ProcessingView({ steps, error }: Props) {
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-lg shadow-indigo-500/20">
              <img src="/radar.svg" alt="ResumeRadar" className="w-6 h-6 invert" />
            </div>
            <span className="text-2xl font-bold font-heading bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ResumeRadar
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/80 px-3.5 py-1.5 rounded-full border border-indigo-500/30">
            <Radar className="w-4 h-4 text-indigo-400 animate-spin" />
            Radar Scanning in Progress
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full">
          {/* Radar Scanning Visual */}
          <div className="flex justify-center mb-8">
            <div className="relative w-28 h-28 rounded-full border-2 border-indigo-500/30 flex items-center justify-center bg-indigo-950/30 shadow-2xl shadow-indigo-500/20 overflow-hidden">
              <div className="absolute inset-0 rounded-full border border-indigo-400/20 animate-ping opacity-25" />
              <div className="absolute inset-2 rounded-full border border-indigo-500/20" />
              <div className="absolute inset-6 rounded-full border border-indigo-500/30" />
              {/* Sweeping radar line */}
              <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-indigo-400 to-transparent origin-left animate-radar" />
              <Radar className="w-10 h-10 text-indigo-400 z-10 relative" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-white mb-2 text-center">
            Analyzing Your Resume...
          </h2>
          <p className="text-slate-400 text-center mb-8 text-sm">
            NVIDIA AI is matching your candidate profile against live web job listings
          </p>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Search Pipeline</span>
              <span className="font-semibold text-indigo-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Steps Container */}
          <div className="glass-panel rounded-2xl p-6 space-y-4 border border-slate-800">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-3.5 p-2.5 rounded-xl transition-colors ${
                  step.status === 'in_progress'
                    ? 'bg-indigo-950/40 border border-indigo-500/30'
                    : step.status === 'completed'
                      ? 'bg-slate-900/30'
                      : ''
                }`}
              >
                <StepIcon status={step.status} />
                <span
                  className={`text-sm font-medium ${
                    step.status === 'completed'
                      ? 'text-slate-200'
                      : step.status === 'in_progress'
                        ? 'text-indigo-300 font-semibold'
                        : step.status === 'failed'
                          ? 'text-rose-400'
                          : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-sm flex items-center gap-3">
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-semibold">Analysis Error</p>
                <p className="text-xs text-rose-300/80">{error}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

