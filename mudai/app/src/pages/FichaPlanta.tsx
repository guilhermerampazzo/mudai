import { Link, useParams } from "react-router-dom";
import { buscarTodas, fotoPlanta } from "../data/plantasIndex";
import { GaugeAgua, GaugeSol, IconBtn } from "../components/ui";
import { Icons } from "../components/icons";

const DIFICULDADE = ["", "Iniciante", "Intermediário", "Avançado"];

export function FichaPlanta() {
  const { slug } = useParams();
  const p = slug ? buscarTodas(slug) : undefined;
  if (!p) {
    return (
      <div className="phone"><div className="screen"><div className="pad">
        <h2>Planta não encontrada</h2>
        <Link to="/">Voltar</Link>
      </div></div></div>
    );
  }
  return (
    <div className="phone">
      <div className="screen">
        <div style={{ position: "relative", background: "var(--green-100)" }}>
          <img
            src={fotoPlanta(p.svg)}
            alt={p.nomePopular}
            style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }}
          />
          <div style={{ position: "absolute", top: "calc(12px + env(safe-area-inset-top))", left: 0, right: 0, padding: "0 16px", display: "flex" }}>
            <Link to="/"><IconBtn label="Voltar"><Icons.Voltar /></IconBtn></Link>
            <span className="grow" />
            <Link to="/pets/novo"><IconBtn label="Adotar"><Icons.Plus /></IconBtn></Link>
          </div>
        </div>
        <div className="pad" style={{ marginTop: -22, position: "relative", background: "var(--cream)", borderRadius: "24px 24px 0 0" }}>
          <div className="row">
            <div className="grow"><h1>{p.nomePopular}</h1><p><i>{p.nomeCientifico}</i></p></div>
            <span className="chip mint">{DIFICULDADE[p.dificuldade]}</span>
          </div>
          <p style={{ marginTop: 10 }}>{p.descricao}</p>

          <div className="card row" style={{ padding: 16, marginTop: 14, justifyContent: "space-around" }}>
            <Stat icon={<Icons.Agua />} valor="Água" sub={p.aguaFreqDias[0] + "–" + p.aguaFreqDias[1] + " dias"} />
            <Stat icon={<Icons.Sun />} valor="Luz" sub={p.tagLuz} />
            <Stat icon={<Icons.Porte />} valor="Porte" sub={p.porte} />
            <Stat icon={<Icons.Termometro />} valor="Clima" sub={`${p.tempMin}–${p.tempMax}°`} />
          </div>

          <h3 style={{ margin: "18px 0 4px" }}>Água</h3>
          <GaugeAgua nivel={p.aguaNivel} />
          <p className="small" style={{ marginTop: 6 }}>Regue a cada {p.aguaFreqDias[0]}–{p.aguaFreqDias[1]} dias</p>

          <h3 style={{ margin: "16px 0 4px" }}>Sol ideal</h3>
          <GaugeSol min={p.luxMin} max={p.luxMax} />

          <h3 style={{ margin: "16px 0 8px" }}>Como cuidar</h3>
          <div className="card" style={{ padding: "6px 16px" }}>
            {p.cuidados.map((c, i) => (
              <p key={c.titulo} style={{ padding: "10px 0", borderBottom: i < p.cuidados.length - 1 ? "1px solid var(--line)" : "none" }}>
                <b style={{ color: "var(--ink)" }}>{i + 1} · {c.titulo}</b> — {c.texto}
              </p>
            ))}
          </div>

          <h3 style={{ margin: "16px 0 8px" }}>Bem-estar</h3>
          <div className="card" style={{ padding: "6px 16px" }}>
            {p.sinais.feliz.map((s) => <p key={s} style={{ padding: "8px 0" }}>Feliz: {s}</p>)}
            {p.sinais.estresse.map((s) => <p key={s} className="small" style={{ padding: "8px 0" }}>Estresse: {s}</p>)}
          </div>

          {p.toxicaPets && (
            <div className="card" style={{ padding: "14px 16px", marginTop: 12, background: "#fbe3e3", borderColor: "transparent" }}>
              <b style={{ fontSize: 13, color: "#a33" }}>Tóxica para pets</b>
              <p className="small" style={{ color: "#a33" }}>Mantenha longe de gatos e cachorros curiosos.</p>
            </div>
          )}

          <div className="row" style={{ marginTop: 16, flexWrap: "wrap" }}>
            {p.tags.map((t) => <span key={t} className="chip">{t}</span>)}
          </div>

          <Link to="/pets/novo" style={{ textDecoration: "none" }}>
            <button className="btn btn-primary btn-block" style={{ marginTop: 18 }}>Adotar como pet</button>
          </Link>
          <div style={{ height: 10 }} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, valor, sub }: { icon: React.ReactNode; valor: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--green-900)" }}>
      <span style={{ display: "inline-flex" }}>{icon}</span>
      {valor}
      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{sub}</span>
    </div>
  );
}
