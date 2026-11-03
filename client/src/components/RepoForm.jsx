import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, Loader2, Upload, X } from 'lucide-react';
import { analyzeRepository } from '../services/api.js';

const URL_RE = /^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/i;
const ALLOWED = ['.txt', '.md', '.markdown', '.pdf'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function RepoForm() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickFile = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const ext = picked.name.slice(picked.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED.includes(ext)) { setError('Unsupported file type. Upload a .txt, .md or .pdf file.'); e.target.value = ''; return; }
    if (picked.size > MAX_BYTES) { setError('That file is larger than 5 MB.'); e.target.value = ''; return; }
    setError('');
    setFile(picked);
  };

  const clearFile = () => { setFile(null); if (fileRef.current) fileRef.current.value = ''; };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!URL_RE.test(url.trim())) {
      setError('Enter a GitHub repository URL like https://github.com/owner/repository.');
      return;
    }
    const body = new FormData();
    body.append('repoUrl', url.trim());
    if (text.trim()) body.append('documentation', text);
    if (file) body.append('documentationFile', file);
    if (force) body.append('force', 'true');

    setLoading(true);
    try {
      const { reportId } = await analyzeRepository(body);
      navigate(`/dashboard/${reportId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const tab = (id, label) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      aria-pressed={mode === id}
      className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
        mode === id 
          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_4px_12px_rgba(79,70,229,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-indigo-400/30' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <form 
      onSubmit={submit} 
      className="rounded-2xl bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] border border-slate-700/60 p-6 md:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.15)]" 
      noValidate
    >
      <label htmlFor="repo-url" className="mb-2 block text-sm font-medium text-slate-200">Public GitHub repository</label>
      <input
        id="repo-url" type="url" inputMode="url" autoComplete="off" placeholder="https://github.com/owner/repository"
        value={url} onChange={(e) => setUrl(e.target.value)} disabled={loading}
        className="w-full rounded-xl border border-slate-700/80 bg-[#090d16] px-3.5 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 transition-all"
      />

      <div className="mb-2 mt-6 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-200">Project documentation <span className="font-normal text-slate-400 text-xs">(optional)</span></span>
        <div className="flex gap-1 rounded-xl bg-[#090d16] p-1 border border-slate-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">{tab('text', 'Paste text')}{tab('file', 'Upload file')}</div>
      </div>

      {mode === 'text' ? (
        <textarea
          aria-label="Project documentation" rows={5} value={text} onChange={(e) => setText(e.target.value)} disabled={loading}
          placeholder="Paste a README, architecture notes, a task list, or anything the previous developer wrote down."
          className="w-full resize-y rounded-xl border border-slate-700/80 bg-[#090d16] px-3.5 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 transition-all"
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 bg-[#090d16] p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          {file ? (
            <div className="flex items-center gap-2.5 text-sm">
              <FileText size={16} className="text-indigo-400" aria-hidden="true" />
              <span className="truncate text-slate-100">{file.name}</span>
              <span className="text-slate-400 text-xs">({(file.size / 1024).toFixed(0)} KB)</span>
              <button type="button" onClick={clearFile} aria-label="Remove file" className="ml-auto rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 py-3 text-sm text-slate-300 hover:text-white transition-colors">
              <Upload size={16} aria-hidden="true" /> Choose a .txt, .md or .pdf file (max 5 MB)
              <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.pdf" onChange={pickFile} disabled={loading} className="sr-only" />
            </label>
          )}
        </div>
      )}

      <label className="mt-5 flex items-start gap-2.5 text-sm text-slate-300 cursor-pointer select-none">
        <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} disabled={loading} className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-[#090d16] text-indigo-500 accent-indigo-500 focus:ring-indigo-500/30" />
        Run a fresh analysis even if this repository was analyzed in the last 24 hours
      </label>

      {error && (
        <div role="alert" className="mt-4 flex gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 px-3.5 py-3 text-sm text-red-200 shadow-inner">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
          {error}
        </div>
      )}

      <button
        type="submit" disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 font-medium text-white transition-all hover:from-indigo-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 shadow-[0_6px_20px_rgba(79,70,229,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-indigo-400/30 active:scale-[0.99]"
      >
        {loading ? (<><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Analyzing repository</>) : 'Analyze project'}
      </button>
      {loading && <p className="mt-3.5 text-center text-xs text-slate-400" aria-live="polite">Fetching GitHub data and generating the report. This usually takes under a minute.</p>}
    </form>
  );
}