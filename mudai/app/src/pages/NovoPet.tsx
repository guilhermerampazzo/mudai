import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fotoPlanta } from "../data/plantasIndex";
import { useCatalogo } from "../lib/catalogo";
import { IconBtn } from "../components/ui";
import { Icons } from "../components/icons";

export function NovoPet({ onAdotar }: { onAdotar: () => void }) {
  const { plantas } = useCatalogo();
  const [apelido, setApelido] = useState("");
  const [slug, setSlug] = useState(plantas[0]?.slug ?? "");
  const [local, setLocal] = useState("Sala");
  const planta = plantas.find((p) => p.slug === slug) ?? plantas[0];
  const locais = ["Sala", "Janela", "Quarto", "Varanda", "Banheiro"];

  const adotar = () => {
    try {
      const raw = localStorage.getItem("mudai:pets:v1");
      const lista = raw ? JSON.parse(raw) : [];
      lista.push({
        id: `pet-${Date.now()}`,
        apelido: apelido.trim() || planta.nomePopular,
        slug,
        local,
        ultimaRegaDias: 0,
        ultimoLux: null,
        tempAmbiente: 24,
      });
      localStorage.setItem("mudai:pets:v1", JSON.stringify(lista));
    } catch { /* sem storage, segue */ }
    onAdotar();
  };

  const adotarOk = useMemo(() => apelido.trim().length <= 24, [apelido]);

  return (
    <div className="phone">
      <div className="screen">
        <div className="topbar">
          <Link to="/pets"><IconBtn label="Voltar"><Icons.Voltar /></IconBtn></Link>
          <h2 className="center">Novo pet</h2>
          <span style={{ width: 42 }} />
        </div>
        <div className="pad" style={{ paddingTop: 6 }}>
          <div className="card center" style={{ padding: 26, background: "linear-gradient(150deg,#d8f3dc,#fffdf8 80%)" }}>
            <img src={fotoPlanta(planta.svg)} alt="" style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 18 }} />
            <p className="small" style={{ marginTop: 8, fontWeight: 800 }}>{planta.nomePopular} · {planta.tagLuz}</p>
          </div>
          <div className="field" style={{ marginTop: 16 }}><label>Apelido do pet</label>
            <input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Ex.: Juju" maxLength={24} />
          </div>
          <div className="field"><label>Espécie</label>
            <select value={slug} onChange={(e) => setSlug(e.target.value)}>
              {plantas.map((p) => <option key={p.slug} value={p.slug}>{p.nomePopular} ({p.nomeCientifico})</option>)}
            </select>
          </div>
          <div className="field"><label>Onde ela fica?</label>
            <div className="row" style={{ flexWrap: "wrap" }}>
              {locais.map((l) => (
                <span key={l} className={`chip${local === l ? " active" : ""}`} onClick={() => setLocal(l)}>{l}</span>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: "14px 16px" }}>
            <b style={{ fontSize: 13.5 }}>Faixa ideal: {planta.luxMin.toLocaleString("pt-BR")}–{planta.luxMax.toLocaleString("pt-BR")} lux</b>
            <p className="small">Meça a luz no local depois de adotar para calibrar a saúde.</p>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={!adotarOk} onClick={adotar}>
            Adotar {apelido.trim() || planta.nomePopular}
          </button>
          <div style={{ height: 10 }} />
        </div>
      </div>
    </div>
  );
}
