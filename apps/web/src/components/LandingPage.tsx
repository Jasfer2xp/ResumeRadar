import { Upload, FileText, Sparkles, Compass, ShieldCheck, Zap } from 'lucide-react';
import { useRef, useState } from 'react';

interface Props {
  onUpload: (file: File) => void;
  loading: boolean;
}

export function LandingPage({ onUpload, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500/30">
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

          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Powered by NVIDIA NIM & Web Radar
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-3xl w-full text-center">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-6 shadow-inner">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Your Resume &bull; Our Radar &bull; Your Next Job
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold font-heading text-white mb-6 leading-tight tracking-tight">
            Find Jobs That Fit <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-purple-400 bg-clip-text text-transparent">
              Your Exact Resume
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Upload your resume once. Our AI automatically extracts your core skills, searches current web postings, and matches you directly with original application links.
          </p>

          {/* Upload Dropzone */}
          <div
            className={`glass-panel rounded-3xl p-10 sm:p-14 transition-all duration-300 cursor-pointer relative overflow-hidden group ${
              dragOver
                ? 'border-indigo-400 bg-indigo-950/40 shadow-2xl shadow-indigo-500/20 scale-[1.01]'
                : 'hover:border-indigo-500/50 hover:bg-slate-900/60 hover:shadow-xl hover:shadow-indigo-500/10'
            } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all" />

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            <div className="relative z-10 flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                {loading ? (
                  <div className="w-9 h-9 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-9 h-9 text-indigo-400" />
                )}
              </div>

              <div>
                <button
                  type="button"
                  className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-base rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? 'Analyzing Resume...' : 'Upload Resume'}
                </button>
                <p className="mt-3 text-sm text-slate-400">or drag and drop your file here</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-4 py-2 rounded-full border border-slate-800">
                <FileText className="w-4 h-4 text-indigo-400" />
                PDF &bull; DOCX &bull; TXT (Up to 10MB)
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 text-left">
            <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Zero Typing Required</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                NVIDIA Inkling extracts your profile and automatically crafts optimal search queries.
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
                <Compass className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Live Web Discovery</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Real web-search providers locate live job postings matching your background.
              </p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800/80">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Honest AI Matching</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                GPT-OSS-20B evaluates match compatibility and lists matched skills vs potential gaps.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>ResumeRadar &copy; 2026. Your resume. Our radar. Your next job.</p>
      </footer>
    </div>
  );
}

