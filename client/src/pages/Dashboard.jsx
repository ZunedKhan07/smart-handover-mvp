import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle, BadgeCheck, BookOpen, Boxes, CheckCircle2, Clock, ExternalLink, FlaskConical, GitBranch, GitFork,
  Info, Lightbulb, Loader2, Pencil, Rocket, ShieldAlert, ShieldCheck, Sparkles, Star, Users,
} from 'lucide-react';
import ReportCard, { EmptyState, Pill, TaskList } from '../components/ReportCard.jsx';
import CompletionRing from '../components/CompletionRing.jsx';
import RoleFilter, { ROLES } from '../components/RoleFilter.jsx';
import EditReportModal from '../components/EditReportModal.jsx';
import { approveReport, getReport } from '../services/api.js';

const GROUP_KEYS = ['frontend', 'backend', 'database', 'devops', 'general'];
const GROUP_LABELS = { frontend: 'Frontend', backend: 'Backend', database: 'Database', devops: 'DevOps', general: 'General' };
const MODULE_TONE = { completed: 'green', 'in-progress': 'indigo', pending: 'amber', unknown: 'slate' };
const MODULE_BAR = { completed: 'bg-emerald-400', 'in-progress': 'bg-indigo-400', pending: 'bg-amber-400', unknown: 'bg-slate-500' };
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];
const SEVERITY_TONE = { critical: 'red', high: 'orange', medium: 'amber', low: 'slate' };
const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

function StatusBlock({ icon, title, text }) {
  return (
    <ReportCard title={title} icon={icon} tone="slate">
      <p className="text-sm leading-relaxed text-slate-300">{text || 'The report does not say.'}</p>
    </ReportCard>
  );
}

export default function Dashboard() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('all');
  const [approving, setApproving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getReport(id)
      .then((r) => active && setReport(r))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const counts = useMemo(() => {
    const c = {};
    GROUP_KEYS.forEach((k) => { c[k] = report?.roleBasedTasks?.[k]?.length || 0; });
    c.all = GROUP_KEYS.reduce((sum, k) => sum + c[k], 0);
    return c;
  }, [report]);

  const moduleCounts = useMemo(() => {
    const c = { completed: 0, 'in-progress': 0, pending: 0, unknown: 0 };
    (report?.moduleBreakdown || []).forEach((m) => { c[m.status] += 1; });
    return c;
  }, [report]);

  const risks = useMemo(
    () => [...(report?.identifiedRisks || [])].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)),
    [report]
  );

  const handleApprove = async () => {
    setActionError('');
    setApproving(true);
    try {
      setReport(await approveReport(report._id));
    } catch (e) {
      setActionError(e.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-32 text-slate-400" aria-live="polite">
        <Loader2 className="animate-spin text-indigo-400" size={22} aria-hidden="true" /> 
        <span className="text-sm font-medium">Loading report...</span>
      </div>
    );
  }
  if (error || !report) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <AlertCircle className="mx-auto text-red-400 drop-shadow-[0_2px_8px_rgba(239,68,68,0.4)]" size={36} aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-slate-100">We could not load this report</h1>
        <p className="mt-2 text-sm text-slate-400">{error || 'The report is unavailable.'}</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:from-indigo-500 hover:to-indigo-400 shadow-[0_6px_20px_rgba(79,70,229,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-indigo-400/30 transition-all">Analyze a repository</Link>
      </div>
    );
  }

  const project = report.project || {};
  const meta = project.metadata || {};
  const approved = report.approvalStatus === 'approved';
  const cacheActive = project.expiresAt && new Date(project.expiresAt) > new Date();
  const activeRole = ROLES.find((r) => r.id === role);
  const visibleGroups = (role === 'all' ? GROUP_KEYS : [role]).filter((k) => (report.roleBasedTasks?.[k] || []).length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      
      {/* Project header and approval */}
      <section className="rounded-2xl bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] border border-slate-700/60 p-6 md:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.15)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <a href={project.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-2xl font-bold text-slate-50 hover:text-indigo-300 transition-colors">
              {project.owner}/{project.name} <ExternalLink size={18} aria-hidden="true" className="text-indigo-400" />
            </a>
            {meta.description && <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">{meta.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5"><GitBranch size={14} className="text-indigo-400" aria-hidden="true" />{project.defaultBranch}</span>
              {meta.language && <span className="rounded bg-[#090d16] px-2 py-0.5 border border-slate-800 text-slate-300">{meta.language}</span>}
              <span className="inline-flex items-center gap-1.5"><Star size={14} className="text-amber-400" aria-hidden="true" />{meta.stars ?? 0}</span>
              <span className="inline-flex items-center gap-1.5"><GitFork size={14} className="text-indigo-300" aria-hidden="true" />{meta.forks ?? 0}</span>
              <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-slate-300" aria-hidden="true" />{project.contributorCount ?? 0} contributors in recent commits</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {approved
              ? <Pill tone="green" icon={BadgeCheck}>Approved {fmt(report.approvedAt)}</Pill>
              : <Pill tone="amber" icon={Clock}>Pending approval</Pill>}
            {report.isEdited && <span className="text-xs text-slate-400">Edited {fmt(report.editedAt)}</span>}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-5">
          {!approved && (
            <>
              <button 
                type="button" 
                onClick={handleApprove} 
                disabled={approving} 
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-70 shadow-[0_6px_15px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-emerald-400/30 active:scale-[0.98]"
              >
                {approving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />} Approve report
              </button>
              <button 
                type="button" 
                onClick={() => setEditing(true)} 
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-slate-800 hover:border-indigo-400/60 hover:text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] active:scale-[0.98]"
              >
                <Pencil size={16} aria-hidden="true" /> Edit report
              </button>
            </>
          )}
          <p className="text-xs text-slate-400">
            {cacheActive
              ? `Analysis is reused until ${fmt(project.expiresAt)}.`
              : 'This analysis is more than 24 hours old. Analyze the repository again for current data.'}
          </p>
        </div>
        {actionError && <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">{actionError}</p>}

        <div className="mt-5 flex gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200 shadow-inner">
          <Info size={16} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
          <p><strong className="font-semibold">MVP limitation:</strong> anyone with access to this app can approve a report. In production, approval must be restricted to authorized administrators.</p>
        </div>
      </section>

      {/* Completion, verified, inferred */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ReportCard title="Completion estimate" icon={Rocket} tone="indigo">
          <div className="flex items-center gap-5">
            <CompletionRing value={report.completionPercentage} />
            <div className="text-sm space-y-2">
              <Pill tone={report.confidence === 'high' ? 'green' : report.confidence === 'medium' ? 'amber' : 'red'}>Confidence: {report.confidence}</Pill>
              <p className="text-xs text-slate-400 leading-relaxed">Capped at 95%. Files and commits cannot prove a project is finished.</p>
            </div>
          </div>
          {report.completionBasis && <p className="mt-5 text-sm leading-relaxed text-slate-300 border-t border-slate-800 pt-4">{report.completionBasis}</p>}
        </ReportCard>

        <ReportCard title="Verified from GitHub" icon={BadgeCheck} tone="green">
          <p className="mb-4 text-xs text-slate-400">Read directly from the repository, not generated by AI.</p>
          {report.verifiedFacts?.length ? <TaskList items={report.verifiedFacts} tone="green" /> : <EmptyState>No verified facts were recorded.</EmptyState>}
        </ReportCard>

        <ReportCard title="AI-inferred" icon={Sparkles} tone="indigo">
          <p className="mb-4 text-xs text-slate-400">Conclusions drawn by the AI. Treat them as leads to check.</p>
          {report.inferredObservations?.length ? <TaskList items={report.inferredObservations} /> : <EmptyState>No inferences were recorded.</EmptyState>}
          {report.uncertainties?.length > 0 && (
            <div className="mt-5 border-t border-slate-800 pt-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">What the AI could not determine</p>
              <TaskList items={report.uncertainties} tone="amber" />
            </div>
          )}
        </ReportCard>
      </div>

      <ReportCard title="Project summary" icon={BookOpen} tone="slate">
        <p className="max-w-4xl text-sm leading-relaxed text-slate-200">{report.projectSummary}</p>
      </ReportCard>

      <div className="grid gap-6 md:grid-cols-3">
        <StatusBlock icon={FlaskConical} title="Testing" text={report.testingStatus} />
        <StatusBlock icon={BookOpen} title="Documentation" text={report.documentationStatus} />
        <StatusBlock icon={Rocket} title="Deployment" text={report.deploymentStatus} />
      </div>

      {/* Role-based handover */}
      <ReportCard title="Handover tasks by role" icon={Users} tone="indigo">
        <RoleFilter value={role} onChange={setRole} counts={counts} />
        <p className="mb-5 mt-4 text-xs font-medium text-slate-400">{activeRole.hint}</p>
        {visibleGroups.length === 0 ? (
          <EmptyState>No tasks were identified for {activeRole.label} in this report.</EmptyState>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((k) => (
              <div key={k} className="rounded-xl bg-[#090d16] p-4 border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                {role === 'all' && <h3 className="mb-3 text-sm font-bold text-slate-200 border-b border-slate-800/80 pb-2">{GROUP_LABELS[k]}</h3>}
                <TaskList items={report.roleBasedTasks[k]} />
              </div>
            ))}
          </div>
        )}
      </ReportCard>

      <div className="grid gap-6 md:grid-cols-2">
        <ReportCard title="Completed work" icon={CheckCircle2} tone="green" count={report.completedTasks?.length}>
          {report.completedTasks?.length ? <TaskList items={report.completedTasks} tone="green" /> : <EmptyState>No completed tasks were identified.</EmptyState>}
        </ReportCard>
        <ReportCard title="Pending work" icon={Clock} tone="amber" count={report.pendingTasks?.length}>
          {report.pendingTasks?.length ? <TaskList items={report.pendingTasks} tone="amber" /> : <EmptyState>No pending tasks were identified.</EmptyState>}
        </ReportCard>
      </div>

      {/* Modules */}
      <ReportCard title="Modules" icon={Boxes} tone="indigo" count={report.moduleBreakdown?.length}>
        {report.moduleBreakdown?.length ? (
          <>
            <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-[#090d16] border border-slate-800 shadow-inner" role="img" aria-label="Module status distribution">
              {Object.entries(moduleCounts).filter(([, n]) => n > 0).map(([status, n]) => (
                <div key={status} className={MODULE_BAR[status]} style={{ width: `${(n / report.moduleBreakdown.length) * 100}%` }} />
              ))}
            </div>
            <p className="mb-6 text-xs text-slate-400 font-medium">
              {Object.entries(moduleCounts).filter(([, n]) => n > 0).map(([s, n]) => `${n} ${s}`).join(', ')}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {report.moduleBreakdown.map((m) => (
                <article key={m.module} className="rounded-xl border border-slate-700/80 bg-[#090d16] p-4.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-slate-100 text-sm">{m.module}</h3>
                    <Pill tone={MODULE_TONE[m.status]}>{m.status}</Pill>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">{m.description}</p>
                  {m.evidence?.length > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-1.5 pt-3 border-t border-slate-800/80">
                      {m.evidence.map((ev) => <code key={ev} className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-300 border border-slate-800 shadow-inner">{ev}</code>)}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        ) : <EmptyState>No modules were identified.</EmptyState>}
      </ReportCard>

      <div className="grid gap-6 md:grid-cols-2">
        <ReportCard title="Technical risks" icon={ShieldAlert} tone="red" count={risks.length}>
          {risks.length ? (
            <ul className="space-y-3">
              {risks.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed rounded-xl bg-[#090d16] p-3.5 border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                  <span className="mt-0.5 shrink-0"><Pill tone={SEVERITY_TONE[r.severity]}>{r.severity}</Pill></span>
                  <span className="text-slate-200 text-xs">{r.description}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState>No risks were identified. That does not mean there are none.</EmptyState>}
        </ReportCard>
        <ReportCard title="Recommended next steps" icon={Lightbulb} tone="indigo" count={report.recommendations?.length}>
          {report.recommendations?.length ? <TaskList items={report.recommendations} /> : <EmptyState>No recommendations were generated.</EmptyState>}
        </ReportCard>
      </div>

      {editing && (
        <EditReportModal report={report} onClose={() => setEditing(false)} onSaved={(r) => { setReport(r); setEditing(false); }} />
      )}
    </div>
  );
}