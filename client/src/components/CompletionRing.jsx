export default function CompletionRing({ value = 0, size = 132 }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);
  const color = value >= 70 ? '#34D399' : value >= 35 ? '#FBBF24' : '#F87171';
  
  return (
    <div 
      className="relative shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] shadow-[0_12px_30px_-6px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.15)] border border-slate-800/60" 
      style={{ width: size, height: size }} 
      role="img" 
      aria-label={`Estimated completion ${value} percent`}
    >
      <svg width={size} height={size} className="-rotate-90 absolute inset-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#090d16" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{value}%</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">estimated</span>
      </div>
    </div>
  );
}