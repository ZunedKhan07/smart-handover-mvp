import { Cloud, Database, Layers, Monitor, Server } from 'lucide-react';

export const ROLES = [
  { id: 'frontend', label: 'Frontend Developer', icon: Monitor, hint: 'UI, React components, API integration' },
  { id: 'backend', label: 'Backend Developer', icon: Server, hint: 'Express APIs, business logic, server issues' },
  { id: 'database', label: 'Database Developer', icon: Database, hint: 'Schemas, relationships, data consistency' },
  { id: 'devops', label: 'DevOps Engineer', icon: Cloud, hint: 'Deployment, environment config, CI/CD' },
  { id: 'all', label: 'General / All Tasks', icon: Layers, hint: 'Every role, grouped' },
];

export default function RoleFilter({ value, onChange, counts }) {
  return (
    <div role="radiogroup" aria-label="Filter tasks by developer role" className="flex flex-wrap gap-2.5">
      {ROLES.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              active
                ? 'border-indigo-400/60 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_6px_20px_rgba(79,70,229,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] scale-[1.02]'
                : 'border-slate-700/80 bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] text-slate-300 hover:border-indigo-400/50 hover:text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] active:scale-95'
            }`}
          >
            <Icon size={16} aria-hidden="true" className={active ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]' : 'text-slate-400'} />
            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{label}</span>
            <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold border ${
              active 
                ? 'bg-indigo-900/60 text-indigo-200 border-indigo-400/30 shadow-inner' 
                : 'bg-[#090d16] text-slate-400 border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
            }`}>
              {counts[id] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}