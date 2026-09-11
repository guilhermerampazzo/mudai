import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fotoPlanta, type FichaPlanta } from "../data/plantasIndex";
import { useCatalogo } from "../lib/catalogo";
import { useConta } from "../lib/conta";
import { ErroAPI, identificarServidor, servidorConfigurado, type Candidato } from "../lib/api";
import { Tabbar, Topbar, GaugeAgua, GaugeSol } from "../components/ui";
import { Icons } from "../components/icons";

type Etapa = "pronto" | "analisando" | "resultado";

interface Resultado {
  planta: FichaPlanta;
  candidatos: Candidato[];
  precisaRevisao: boolean;
  cache: boolean;
  origem: "ia" | "local";
}

function fichaParaPlanta(f: {
  slug: string;
  nomePopular: string;
  nomeCientifico: string;
  descricao: string;
  aguaNivel: number;
  aguaFreqDias: [number, number];
  luxMin: number;
  luxMax: number;
  tempMin: number;
  tempMax: number;
  umidadeMin: number;
  umidadeMax: number;
  dificuldade: number;
  porte: string;
  toxicaPets: boolean;
  tags: string[];
  tagLuz: string;
  cuidados: { titulo: string; texto: string }[];
  sinais: { feliz: string[]; estresse: string[] };
  curiosidades: string[];
}, foto?: string): FichaPlanta {
  return {
    ...f,
    svg: foto || "epipremnum-aureum.jpg",
    dificuldade: Math.min(3, Math.max(1, f.dificuldade)) as 1 | 2 | 3,
  };
}

export function Identificar() {
  const { plantas, buscar, recarregar } = useCatalogo();
  const { verificado, uso, pedirConta, anotarUso } = useConta();
  const liberado = !servidorConfigurado() || verificado;

  const [etapa, setEtapa] = useState<Etapa>("pronto");
  const [previa, setPrevia] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const restantes = uso ? Math.max(0, uso.limites.visaoSemana - uso.visaoSemana) : null;

  const escolher = (file: File | undefined) => {
    if (!file) return;
    if (!liberado) {
      pedirConta("identificar");
      return;
    }
    const url = URL.createObjectURL(file);
    setPrevia(url);
    setErro(null);
    setEtapa("analisando");

    if (servidorConfigurado()) {
      identificarServidor(file)
        .then((r) => {
          recarregar();
          anotarUso(r.uso);
          const local = buscar(r.ficha.slug);
          const planta = local ?? fichaParaPlanta(r.ficha, r.arquivoUrl);
          setResultado({
            planta,
            candidatos: r.candidatos,
            precisaRevisao: r.precisaRevisao,
            cache: r.cache,
            origem: "ia",
          });
          setEtapa("resultado");
        })
        .catch((e) => {
          const mensagem =
            e instanceof ErroAPI
              ? e.code === "LIMITE_VISAO"
                ? e.message
                : e.message
              : "Não consegui olhar a foto agora. Tenta de novo.";
          setErro(mensagem);
          setEtapa("pronto");
        });
      return;
    }

    // Sem servidor: escolhe pela lista local (modo demonstração).
    window.setTimeout(() => {
      const melhor = plantas[0];
      if (melhor) {
        setResultado({ planta: melhor, candidatos: [], precisaRevisao: false, cache: false, origem: "local" });
        setEtapa("resultado");
      }
    }, 1000);
  };

  const trocarCandidato = (c: Candidato) => {
    const local = plantas.find((p) => p.nomePopular.toLowerCase() === c.nomePopular.toLowerCase());
    if (local) {
      setResultado((r) => (r ? { ...r, planta: local } : r));
    }
  };

  const melhorConfianca = useMemo(
    () => (resultado?.candidatos[0]?.confianca ?? 0),
    [resultado]
  );

  return (
    <div className="phone">
      <div className="screen">
        <Topbar
          titulo="Identificar"
          subtitulo={
            restantes != null
              ? `${restantes} fotos restantes nesta semana`
              : servidorConfigurado()
                ? "Foto → a IA identifica"
                : "Foto → ficha do catálogo"
          }
        />
        <div className="pad" style={{ paddingTop: 10 }}>
          <div style={{ borderRadius: "var(--r-lg)", overflow: "hidden", position: "relative", height: 300, background: "linear-gradient(150deg,#d8f3dc,#95d5b2)", border: "1.5px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {previa ? (
              <img src={previa} alt="Prévia" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div className="center" style={{ padding: 24 }}>
                <Icons.Camera />
                <p className="small" style={{ marginTop: 8 }}>Tire uma foto da planta inteira, com boa luz</p>
              </div>
            )}
          </div>
          <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => escolher(e.target.files?.[0])} />

          {!liberado ? (
            <div className="card" style={{ padding: 16, marginTop: 14, background: "linear-gradient(135deg,#edf7ef,#fffdf8)" }}>
              <b style={{ fontSize: 15 }}>Crie sua conta para identificar</b>
              <p style={{ marginTop: 6 }}>
                Cada conta tem {uso?.limites.visaoSemana ?? 20} identificações por semana. É grátis.
              </p>
              <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => pedirConta("identificar")}>
                Criar conta
              </button>
            </div>
          ) : (
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-primary grow" onClick={() => input.current?.click()}>Tirar foto</button>
              <button className="btn btn-ghost grow" onClick={() => input.current?.click()}>Galeria</button>
            </div>
          )}

          {etapa === "analisando" && (
            <div className="card" style={{ padding: 16, marginTop: 14 }}>
              <b>Olhando a foto…</b>
              <p className="small">Comparando folha, caule e porte com o catálogo.</p>
            </div>
          )}

          {erro && (
            <div className="card" style={{ padding: 16, marginTop: 14, background: "#fbe3e3", borderColor: "transparent" }}>
              <b style={{ fontSize: 13.5, color: "#a33" }}>{erro}</b>
              {erro.includes("semana") && (
                <p className="small" style={{ color: "#a33" }}>Dá pra continuar usando o resto do app normalmente.</p>
              )}
            </div>
          )}

          {etapa === "resultado" && resultado && (
            <>
              <div className="card" style={{ padding: 16, marginTop: 14 }}>
                <div className="row">
                  <img src={fotoPlanta(resultado.planta.svg)} style={{ width: 56, height: 56, objectFit: "cover", background: "var(--green-50)", borderRadius: 14 }} alt="" />
                  <div className="grow">
                    <p className="small" style={{ fontWeight: 800, color: melhorConfianca >= 70 ? "var(--green-700)" : "#8a6d1c" }}>
                      {resultado.cache ? "JÁ IDENTIFICADA" : melhorConfianca >= 70 ? `IDENTIFICADA · ${melhorConfianca}%` : `TALVEZ · ${melhorConfianca}%`}
                    </p>
                    <b style={{ fontSize: 16 }}>{resultado.planta.nomePopular}</b>
                    <p className="small"><i>{resultado.planta.nomeCientifico}</i></p>
                  </div>
                </div>

                {resultado.candidatos[0]?.porque && (
                  <p className="small" style={{ marginTop: 10 }}>{resultado.candidatos[0].porque}</p>
                )}

                {!resultado.precisaRevisao && (
                  <div className="row" style={{ marginTop: 10 }}>
                    <span className="chip mint">{resultado.planta.tagLuz}</span>
                  </div>
                )}

                <h3 style={{ margin: "12px 0 4px" }}>Água</h3>
                <GaugeAgua nivel={resultado.planta.aguaNivel} />
                <h3 style={{ margin: "12px 0 4px" }}>Sol ideal</h3>
                <GaugeSol min={resultado.planta.luxMin} max={resultado.planta.luxMax} />

                <p className="small" style={{ marginTop: 8 }}>
                  {resultado.origem === "ia"
                    ? resultado.cache
                      ? "Essa foto já tinha sido identificada antes, então não gastou nada."
                      : "Ficha completa gerada no padrão do catálogo."
                    : "Ficha do catálogo."}
                </p>

                <div className="row" style={{ marginTop: 12 }}>
                  <Link to={`/planta/${resultado.planta.slug}`} className="grow" style={{ textDecoration: "none" }}>
                    <button className="btn btn-primary btn-block">Ver ficha completa</button>
                  </Link>
                  <Link to="/pets/novo" className="grow" style={{ textDecoration: "none" }}>
                    <button className="btn btn-ghost btn-block">Adotar</button>
                  </Link>
                </div>
              </div>

              {resultado.candidatos.length > 1 && (
                <div className="card" style={{ padding: 16, marginTop: 12 }}>
                  <b style={{ fontSize: 14 }}>{resultado.precisaRevisao ? "Ficou na dúvida. É qual destas?" : "Outras parecidas"}</b>
                  <p className="small" style={{ marginTop: 4 }}>
                    {resultado.precisaRevisao
                      ? "A foto não deixou claro. Se você sabe qual é, toca nela que eu ajusto a ficha."
                      : "Se você acha que errei, toca na certa."}
                  </p>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {resultado.candidatos.map((c) => (
                      <div
                        key={c.nomePopular}
                        className="card row"
                        style={{ padding: 10, cursor: "pointer", borderColor: c.nomePopular === resultado.planta.nomePopular ? "var(--green-500)" : undefined }}
                        onClick={() => trocarCandidato(c)}
                      >
                        <div className="grow" style={{ minWidth: 0 }}>
                          <b style={{ fontSize: 13.5 }}>{c.nomePopular}</b>
                          <p className="small"><i>{c.nomeCientifico}</i></p>
                        </div>
                        <span className={`chip${c.confianca >= 70 ? " mint" : ""}`} style={{ fontSize: 11, padding: "6px 10px" }}>
                          {c.confianca}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => { setEtapa("pronto"); setResultado(null); setPrevia(null); }}>
                Tirar outra foto
              </button>
            </>
          )}
          <div style={{ height: 10 }} />
        </div>
      </div>
      <Tabbar />
    </div>
  );
}
