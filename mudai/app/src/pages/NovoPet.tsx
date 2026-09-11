import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fotoPlanta } from "../data/plantasIndex";
import { useCatalogo } from "../lib/catalogo";
import { useConta } from "../lib/conta";
import { intervaloDaPlanta, carregarPets, salvarPets, type Pet } from "../lib/pets";
import { agendarRegas, notificacoesDisponiveis, pedirPermissao } from "../lib/notificacoes";
import { IconBtn } from "../components/ui";
import { Icons } from "../components/icons";

const LOCAIS = ["Sala", "Janela", "Quarto", "Varanda", "Banheiro"];

export function NovoPet({ onAdotar }: { onAdotar: () => void }) {
  const { plantas, buscar } = useCatalogo();
  const { verificado, pedirConta } = useConta();
  const liberado = verificado;

  const [apelido, setApelido] = useState("");
  const [slug, setSlug] = useState(plantas[0]?.slug ?? "");
  const [local, setLocal] = useState("Sala");
  const [salvando, setSalvando] = useState(false);

  const planta = plantas.find((p) => p.slug === slug) ?? plantas[0];

  const podeSalvar = useMemo(
    () => Boolean(planta) && apelido.trim().length <= 24,
    [planta, apelido]
  );

  const salvar = async (comAviso: boolean) => {
    if (!planta || !podeSalvar) return;
    setSalvando(true);

    const pets = carregarPets(buscar);
    const novo: Pet = {
      id: `pet-${Date.now()}`,
      apelido: apelido.trim() || planta.nomePopular,
      slug,
      planta,
      local,
      ultimaRegaDias: 0,
      ultimoLux: null,
      tempAmbiente: 24,
      criadoEm: new Date().toISOString(),
      notificar: comAviso,
    };
    const lista = [...pets, novo];
    salvarPets(lista);

    if (comAviso && notificacoesDisponiveis()) {
      const ok = await pedirPermissao();
      novo.notificar = ok;
      salvarPets(lista);
      if (ok) await agendarRegas(lista);
    }

    setSalvando(false);
    onAdotar();
  };

  if (!liberado) {
    return (
      <div className="phone">
        <div className="screen">
          <div className="topbar">
            <Link to="/pets"><IconBtn label="Voltar"><Icons.Voltar /></IconBtn></Link>
            <h2 className="center">Nova planta</h2>
            <span style={{ width: 42 }} />
          </div>
          <div className="pad" style={{ paddingTop: 6 }}>
            <div className="card" style={{ padding: 20, background: "linear-gradient(150deg,#edf7ef,#fffdf8 80%)" }}>
              <b style={{ fontSize: 16 }}>Crie sua conta para cadastrar a planta</b>
              <p style={{ marginTop: 8 }}>
                Assim ela fica salva com você e os lembretes de rega funcionam certinho no seu aparelho.
              </p>
              <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => pedirConta("pet")}>
                Criar conta
              </button>
              <Link to="/" style={{ textDecoration: "none" }}>
                <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>Continuar só olhando</button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!planta) {
    return (
      <div className="phone"><div className="screen"><div className="pad">
        <h2>Catálogo vazio</h2>
        <Link to="/">Voltar</Link>
      </div></div></div>
    );
  }

  return (
    <div className="phone">
      <div className="screen">
        <div className="topbar">
          <Link to="/pets"><IconBtn label="Voltar"><Icons.Voltar /></IconBtn></Link>
          <h2 className="center">Nova planta</h2>
          <span style={{ width: 42 }} />
        </div>
        <div className="pad" style={{ paddingTop: 6 }}>
          <div className="card center" style={{ padding: 24, background: "linear-gradient(150deg,#d8f3dc,#fffdf8 80%)" }}>
            <img src={fotoPlanta(planta.svg)} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 20 }} />
            <p className="small" style={{ marginTop: 10, fontWeight: 800 }}>{planta.nomePopular} · {planta.tagLuz}</p>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label>Apelido da planta</label>
            <input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Ex.: Juju" maxLength={24} />
          </div>

          <div className="field">
            <label>Espécie</label>
            <select value={slug} onChange={(e) => setSlug(e.target.value)}>
              {plantas.map((p) => (
                <option key={p.slug} value={p.slug}>{p.nomePopular} ({p.nomeCientifico})</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Onde ela fica?</label>
            <div className="row" style={{ flexWrap: "wrap" }}>
              {LOCAIS.map((l) => (
                <span key={l} className={`chip${local === l ? " active" : ""}`} onClick={() => setLocal(l)}>{l}</span>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "14px 16px" }}>
            <b style={{ fontSize: 13.5 }}>Precisa de água a cada {intervaloDaPlanta(planta.aguaFreqDias)} dia(s)</b>
            <p className="small">
              Faixa ideal de luz: {planta.luxMin.toLocaleString("pt-BR")}–{planta.luxMax.toLocaleString("pt-BR")} lux.
              Depois dá pra medir a luz do lugar com o medidor.
            </p>
          </div>

          {notificacoesDisponiveis() && (
            <div className="card" style={{ padding: "14px 16px", marginTop: 10 }}>
              <b style={{ fontSize: 13.5 }}>Quer que eu avise na hora de regar?</b>
              <p className="small">
                Vou te lembrar a cada {intervaloDaPlanta(planta.aguaFreqDias)} dia(s), que é o ritmo dessa planta.
              </p>
            </div>
          )}

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
            disabled={!podeSalvar || salvando}
            onClick={() => salvar(notificacoesDisponiveis())}
          >
            {salvando ? "Salvando…" : `Cadastrar ${apelido.trim() || planta.nomePopular}`}
          </button>

          {notificacoesDisponiveis() && (
            <button
              className="btn btn-ghost btn-block"
              style={{ marginTop: 8 }}
              disabled={!podeSalvar || salvando}
              onClick={() => salvar(false)}
            >
              Cadastrar sem lembrete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
