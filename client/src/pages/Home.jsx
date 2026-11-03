import RepoForm from '../components/RepoForm.jsx';

const FEATURES = [
  ['Evidence-based report', 'Every module and claim points to the files or commits it came from, so you can check it yourself.'],
  ['Verified facts apart from AI inference', 'File counts, tests, CI and Docker are read directly from GitHub. Everything the AI concludes is labeled as inference.'],
  ['Secrets masked before analysis', 'Keys, tokens, connection strings and emails are masked, and .env and key files are left out, before anything reaches Gemini.'],
  ['Task lists by role', 'Switch between frontend, backend, database and DevOps to see only the work that applies to you.'],
  ['Review, edit and approve', 'Correct the generated report, then approve it. The approval and its timestamp are stored with the report.'],
  ['Reports that last', 'Reports are saved, open from a link after a refresh, and analyses are reused for 24 hours.'],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-14">
      <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl text-slate-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Understand an inherited codebase before you change it
          </h1>
          <p className="mt-6 max-w-xl text-base lg:text-lg leading-relaxed text-slate-300">
            When a developer leaves, their knowledge leaves with them. Smart Handover reads a public GitHub repository and your notes, then writes a report on what is built, what is missing and where to start.
          </p>
          <div className="mt-8 max-w-xl space-y-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-[#0f172a] to-[#020617] p-5 border-l-4 border-indigo-500 text-slate-300 border-t border-r border-b border-slate-800/80 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <p className="text-sm leading-relaxed">New developers lose days working out what is finished and what only looks finished.</p>
            <p className="text-sm leading-relaxed">Commit messages say what someone intended. They rarely show what works. The report keeps that difference visible.</p>
          </div>
        </div>
        <RepoForm />
      </div>

      <section className="mt-28" aria-labelledby="features-title">
        <h2 id="features-title" className="text-2xl font-bold text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] border-b border-slate-800 pb-4">
          What you get
        </h2>
        <dl className="mt-6 grid gap-x-12 sm:grid-cols-2">
          {FEATURES.map(([title, text]) => (
            <div key={title} className="border-t border-slate-800/80 py-6 transition-all hover:translate-x-1">
              <dt className="font-bold text-slate-100 text-base drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-400">{text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}