import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { updateReport } from '../services/api.js';

const toText = (list = []) => list.join('\n');
const toList = (text) => text.split('\n').map((s) => s.trim()).filter(Boolean);
const ROLE_FIELDS = [
  ['frontend', 'Frontend tasks'], ['backend', 'Backend tasks'], ['database', 'Database tasks'], ['devops', 'DevOps tasks'], ['general', 'General tasks'],
];

const inputCls = 'w-full rounded-xl border border-slate-700/80 bg-[#090d16] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all';

export default function EditReportModal({ report, onClose, onSaved }) {
  const [form, setForm] = useState({
    projectSummary: report.projectSummary || '',
    testingStatus: report.testingStatus || '',
    documentationStatus: report.documentationStatus || '',
    deploymentStatus: report.deploymentStatus || '',
    completedTasks: toText(report.completedTasks),
    pendingTasks: toText(report.pendingTasks),
    recommendations: toText(report.recommendations),
    ...Object.fromEntries(ROLE_FIELDS.map(([k]) => [`role_${k}`, toText(report.roleBasedTasks?.[k])])),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updated = await updateReport(report._id, {
        projectSummary: form.projectSummary,
        testingStatus: form.testingStatus,
        documentationStatus: form.documentationStatus,
        deploymentStatus: form.deploymentStatus,
        completedTasks: toList(form.completedTasks),
        pendingTasks: toList(form.pendingTasks),
        recommendations: toList(form.recommendations),
        roleBasedTasks: Object.fromEntries(ROLE_FIELDS.map(([k]) => [k, toList(form[`role_${k}`])])),
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const area = (key, label, rows = 4) => (
    <div>
      <label htmlFor={key} className="mb-1.5 block text-sm font-medium text-slate-200">{label}</label>
      <textarea id={key} rows={rows} value={form[key]} onChange={set(key)} className={`${inputCls} resize-y`} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/75 backdrop-blur-sm p-4" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="edit-title" className="my-8 w-full max-w-2xl rounded-2xl bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] border border-slate-700/60 p-6 md:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.15)]">
        
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 id="edit-title" className="text-xl font-bold text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Edit report</h2>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={saving} 
            aria-label="Close" 
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all shadow-[0_2px_5px_rgba(0,0,0,0.4)]"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-6 text-sm text-slate-400 leading-relaxed">
          Enter one task or recommendation per line. Edits are saved to the report; the AI-generated evidence and verified facts stay unchanged. Approved reports cannot be edited.
        </p>

        {/* Form Fields */}
        <div className="space-y-5">
          {area('projectSummary', 'Project summary', 4)}
          {area('completedTasks', 'Completed tasks')}
          {area('pendingTasks', 'Pending tasks')}
          {area('recommendations', 'Recommendations')}
          <div className="grid gap-4 sm:grid-cols-2">
            {ROLE_FIELDS.map(([k, label]) => <div key={k}>{area(`role_${k}`, label, 3)}</div>)}
          </div>
          {area('testingStatus', 'Testing status', 2)}
          {area('documentationStatus', 'Documentation status', 2)}
          {area('deploymentStatus', 'Deployment status', 2)}
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-200 shadow-inner">
            {error}
          </p>
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={saving} 
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white border border-slate-700/60 shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={saving} 
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-70 shadow-[0_6px_15px_rgba(79,70,229,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-indigo-400/30 transition-all active:scale-[0.98]"
          >
            {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} Save changes
          </button>
        </div>

      </form>
    </div>
  );
}