import { Link } from 'react-router-dom';
import { GitPullRequestArrow } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-gradient-to-b from-[#0f172a]/95 via-[#090d16]/90 to-[#020617]/95 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.8)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        
        {/* Logo / Brand */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-slate-100 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-[0_4px_12px_rgba(79,70,229,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-indigo-400/30 transition-transform group-hover:scale-105">
            <GitPullRequestArrow size={18} aria-hidden="true" className="drop-shadow" />
          </span>
          <span className="tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Smart Handover</span>
        </Link>

        {/* Nav Link */}
        <Link 
          to="/" 
          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800/80 hover:text-white border border-transparent hover:border-slate-700/60 shadow-[0_2px_6px_rgba(0,0,0,0.2)] active:scale-95"
        >
          Analyze a repository
        </Link>

      </div>
    </header>
  );
}