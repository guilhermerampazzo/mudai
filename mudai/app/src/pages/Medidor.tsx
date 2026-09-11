import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { buscarTodas } from "../data/plantasIndex";
import { carregarPets } from "../lib/pets";
import { estatisticas, faixaLux, simularLux, type AmostraLux } from "../lib/lux";
import { LightSensor } from "../lib/lightSensor";
import { Tabbar, Topbar, IconBtn } from "../components/ui";
import { Icons } from "../components/icons";

type Fonte = "sensor" | "simulado";

export function Medidor({ onSalvar }: { onSalvar: () => void }) {
  const pets = useMemo(() => carregarPets(buscarTodas), []);
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [amostras, setAmostras] = useState<AmostraLux[]>([]);
  const [congelado, setCongelado] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [fonte, setFonte] = useState<Fonte>("simulado");
  const [fator, setFator] = useState(1);
  const timer = useRef<number | null>(null);
  const congeladoRef = useRef(false);
  congeladoRef.current = congelado;

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let ativo = true;
    (async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;
        const info = await LightSensor.getMaxRange();
        if (!info.disponivel || !ativo) return;
        await LightSensor.start();
        if (!ativo) return;
        sub = await LightSensor.addListener("lux", (e) => {
          if (congeladoRef.current) return;
          setFonte("sensor");
          setAmostras((a) => [...a.slice(-59), { t: Date.now(), lux: Math.round(e.lux) }]);
        });
      } catch {
        /* sem sensor: mantém simulado */
      }
    })();
    timer.current = window.setInterval(() => {
      setFonte((f) => {
        if (f === "sensor" || congeladoRef.current) return f;
        setAmostras((a) => [...a.slice(-59), { t: Date.now(), lux: simularLux() }]);
        return f;
      });
    }, 500);
    return () => {
      ativo = false;
      if (timer.current) window.clearInterval(timer.current);
      sub?.remove();
      LightSensor.removeAllListeners().catch(() => {});
      LightSensor.stop().catch(() => {});
    };
  }, []);

  const stats = estatisticas(amostras);
  const ajustado = {
    ...stats,
    atual: Math.round(stats.atual * fator),
    pico: Math.round(stats.pico * fator),
    max: Math.round(stats.max * fator),
    min: Math.round(stats.min * fator),
    media: Math.round(stats.media * fator),
  };
  const faixa = faixaLux(ajustado.atual);
  const pet = pets.find((p) => p.id === petId);

  const salvar = () => {
    if (!pet) return;
    try {
      const raw = localStorage.getItem("mudai:pets:v1");
      const lista = raw ? JSON.parse(raw) : [];
      const atualizada = lista.map((p: { id: string }) => (p.id === pet.id ? { ...p, ultimoLux: ajustado.atual } : p));
      localStorage.setItem("mudai:pets:v1", JSON.stringify(atualizada));
    } catch { /* segue */ }
    setSalvo(true);
    onSalvar();
    window.setTimeout(() => setSalvo(false), 2500);
  };

  const maxBarra = Math.max(1, ...amostras.map((a) => a.lux * fator));

  return (
    <div className="phone">
      <div className="screen">
        <Topbar titulo="Medidor de luz" subtitulo={fonte === "sensor" ? "Sensor real do aparelho" : "Aguardando sensor… (demonstração)"} />
        <div className="pad" style={{ paddingTop: 10 }}>
          <div style={{ background: "linear-gradient(150deg,var(--green-950),var(--green-700))", borderRadius: "var(--r-lg)", padding: "26px 20px", color: "#fff", textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,.7)", fontSize: 12, fontWeight: 800 }}>
              {congelado ? "CONGELADO" : "AGORA"} · {pet ? `NO(A) ${pet.apelido.toUpperCase()}` : "SEM PET"}
            </p>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{ajustado.atual.toLocaleString("pt-BR")}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--mustard-soft)" }}>lux {fonte === "sensor" ? "· real" : "· demo"}</div>
            <span className={`chip ${faixa.classe}`} style={{ marginTop: 12 }}>{faixa.rotulo}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
            {[["PICO", ajustado.pico], ["MÁX", ajustado.max], ["MÍN", ajustado.min], ["MÉDIA", ajustado.media]].map(([rot, v]) => (
              <div key={rot as string} className="card" style={{ padding: "12px 6px", textAlign: "center" }}>
                <b style={{ fontSize: 15, display: "block" }}>{(v as number).toLocaleString("pt-BR")}</b>
                <span className="small" style={{ fontWeight: 700 }}>{rot}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16, marginTop: 12 }}>
            <h3>Últimos 30 segundos</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 64, marginTop: 14 }}>
              {amostras.map((a, i) => (
                <i key={a.t + "-" + i} style={{ flex: 1, borderRadius: "4px 4px 2px 2px", background: "linear-gradient(180deg,var(--mustard),#f6df9e)", minHeight: 6, height: `${Math.max(8, ((a.lux * fator) / maxBarra) * 100)}%` }} />
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 16, marginTop: 12 }}>
            <h3>Calibração</h3>
            <p className="small">Compare com outro luxímetro e ajuste até bater.</p>
            <div className="row" style={{ marginTop: 10 }}>
              {[0.5, 1, 2, 5].map((f) => (
                <span key={f} className={`chip${fator === f ? " active" : ""}`} onClick={() => setFator(f)}>×{f}</span>
              ))}
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}><label>Salvar leitura em</label>
            <select value={petId} onChange={(e) => setPetId(e.target.value)}>
              {pets.map((p) => <option key={p.id} value={p.id}>{p.apelido} ({p.planta.nomePopular})</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-block" onClick={salvar}>
            {salvo ? "Leitura salva no pet" : `Salvar ${ajustado.atual.toLocaleString("pt-BR")} lux`}
          </button>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-ghost grow" onClick={() => setCongelado((c) => !c)}>{congelado ? "Retomar" : "Congelar"}</button>
            <button className="btn btn-ghost grow" onClick={() => setAmostras([])}>Reiniciar</button>
            <IconBtn label="Sobre o sensor"><Icons.Sun /></IconBtn>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            {fonte === "sensor"
              ? "Lendo o sensor de luz ambiente do aparelho em tempo real. Cubra o topo do celular para ver o valor cair."
              : "Sensor ainda não respondeu — mostrando demonstração. No aparelho com sensor, o valor real entra sozinho."}
          </p>
        </div>
      </div>
      <Tabbar />
    </div>
  );
}
