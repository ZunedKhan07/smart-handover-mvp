import { CheckCircle2, Circle } from 'lucide-react';

const TONES = {
  green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30 shadow-[0_2px_8px_rgba(16,185,129,0.15)]',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/30 shadow-[0_2px_8px_rgba(245,158,11,0.15)]',
  red: 'bg-red-500/15 text-red-300 ring-red-500/30 shadow-[0_2px_8px_rgba(239,68,68,0.15)]',
  orange: 'bg-orange-500/15 text-orange-300 ring-orange-500/30 shadow-[0_2px_8px_rgba(249,115,22,0.15)]',
  indigo: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30 shadow-[0_2px_8px_rgba(79,70,229,0.15)]',
  slate: 'bg-slate-500/15 text-slate-300 ring-slate-500/30 shadow-[0_2px_8px_rgba(100,116,139,0.15)]',
};

export function Pill({ tone = 'slate', icon: Icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {Icon && <Icon size={13} aria-hidden="true" className="drop-shadow" />}
      {children}
    </span>
  );
}

export function EmptyState({ children }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-700 bg-[#090d16] px-4 py-6 text-center text-sm text-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
      {children}
    </p>
  );
}

export function TaskList({ items, tone = 'slate' }) {
  const Icon = tone === 'green' ? CheckCircle2 : Circle;
  const color = tone === 'green' ? 'text-emerald-400 drop-shadow-[0_2px_4px_rgba(16,185,129,0.4)]' : tone === 'amber' ? 'text-amber-400 drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)]' : 'text-indigo-400 drop-shadow-[0_2px_4px_rgba(79,70,229,0.4)]';
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={`${i}-${item.slice(0, 20)}`} className="flex gap-3 text-sm text-slate-200 leading-relaxed">
          <Icon size={16} className={`mt-0.5 shrink-0 ${color}`} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReportCard({ title, icon: Icon, count, tone = 'indigo', children, className = '' }) {
  const iconColor = { 
    green: 'text-emerald-400 drop-shadow-[0_2px_4px_rgba(16,185,129,0.4)]', 
    amber: 'text-amber-400 drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)]', 
    red: 'text-red-400 drop-shadow-[0_2px_4px_rgba(239,68,68,0.4)]', 
    indigo: 'text-indigo-400 drop-shadow-[0_2px_4px_rgba(79,70,229,0.4)]', 
    slate: 'text-slate-400' 
  }[tone];

  return (
    <section className={`rounded-2xl bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] border border-slate-700/60 p-6 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.15)] ${className}`}>
      <div className="mb-5 flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
        {Icon && <Icon size={20} className={iconColor} aria-hidden="true" />}
        <h2 className="text-base font-bold text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{title}</h2>
        {typeof count === 'number' && (
          <span className="ml-auto rounded-lg bg-[#090d16] px-2.5 py-1 text-xs font-semibold text-slate-300 border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}