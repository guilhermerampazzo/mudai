import { NavLink } from "react-router-dom";
import { Icons } from "./icons";

export function Tabbar() {
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");
  return (
    <nav className="tabbar">
      <NavLink to="/" className={cls} aria-label="Descobrir"><Icons.Home /></NavLink>
      <NavLink to="/medidor" className={cls} aria-label="Medidor"><Icons.Sun /></NavLink>
      <NavLink to="/identificar" className={cls} aria-label="Identificar"><Icons.Camera /></NavLink>
      <NavLink to="/chat" className={cls} aria-label="Hachimi"><Icons.Chat /></NavLink>
      <NavLink to="/sol" className={cls} aria-label="Sol"><Icons.Compass /></NavLink>
    </nav>
  );
}

export function Topbar({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: string; acao?: React.ReactNode }) {
  return (
    <div className="topbar">
      <div className="grow">
        <h2>{titulo}</h2>
        {subtitulo && <p className="small">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}

export function IconBtn({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <span className="icon-btn" role="button" aria-label={label} onClick={onClick}>
      {children}
    </span>
  );
}

export function GaugeAgua({ nivel }: { nivel: number }) {
  return (
    <div className="gauge">
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${(nivel / 5) * 100}%`, background: "linear-gradient(90deg,#95d5b2,#2d6a4f)" }} />
        <div className="gauge-marker" style={{ left: `${(nivel / 5) * 100}%` }} />
      </div>
    </div>
  );
}

export function GaugeSol({ min, max }: { min: number; max: number }) {
  const pos = Math.min(96, Math.max(4, (Math.log10(min) / Math.log10(50000)) * 100));
  return (
    <div className="gauge">
      <div className="gauge-track" style={{ background: "linear-gradient(90deg,#5a6b62,#f6df9e,#e9b44c,#c96f4a)" }}>
        <div className="gauge-marker" style={{ left: `${pos}%` }} />
      </div>
      <p className="small" style={{ marginTop: 6 }}>{min.toLocaleString("pt-BR")}–{max.toLocaleString("pt-BR")} lux</p>
    </div>
  );
}

export function HealthRing({ score }: { score: number }) {
  const cor = score >= 85 ? "#2d6a4f" : score >= 65 ? "#52b788" : score >= 45 ? "#e9b44c" : "#d64545";
  const off = 239 - (239 * score) / 100;
  return (
    <div className="health-ring">
      <svg width="92" height="92">
        <circle cx="46" cy="46" r="38" fill="none" stroke="#eceee7" strokeWidth="9" />
        <circle cx="46" cy="46" r="38" fill="none" stroke={cor} strokeWidth="9" strokeLinecap="round" strokeDasharray="239" strokeDashoffset={off} />
      </svg>
      <div className="num"><b>{score}</b><span>saúde</span></div>
    </div>
  );
}
