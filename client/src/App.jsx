import { Link, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Page not found</h1>
      <p className="mt-2 text-sm text-slate-400">The page you opened does not exist.</p>
      <Link 
        to="/" 
        className="mt-6 inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:from-indigo-500 hover:to-indigo-400 shadow-[0_6px_20px_rgba(79,70,229,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-indigo-400/30 transition-all active:scale-[0.98]"
      >
        Go to the home page
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard/:id" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}