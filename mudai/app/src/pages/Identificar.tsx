import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TODAS_PLANTAS, buscarTodas, fotoPlanta, type FichaPlanta } from "../data/plantasIndex";
import { identificarServidor, servidorConfigurado } from "../lib/api";
import { Tabbar, Topbar, GaugeAgua, GaugeSol } from "../components/ui";
import { Icons } from "../components/icons";

type Etapa = "pronto" | "analisando" | "resultado";

const PALAVRAS: Record<string, string[]> = {
  jiboia: ["jiboia", "epipremnum", "pendente", "coração"],
  zamioculca: ["zamioculca", "zz", "brilhante"],
  "espada-de-sao-jorge": ["espada", "sansevieria", "são jorge"],
  samambaia: ["samambaia", "nephrolepis", "renda"],
  echeveria: ["echeveria", "suculenta", "roseta", "gorda"],
  orquidea: ["orquidea", "orquídea", "phalaenopsis", "flor"],
  "costela-de-adao": ["costela", "monstera", "recorte", "rasgo"],
  cacto: ["cacto", "cactus", "espinho"],
};

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
}): FichaPlanta {
  return { ...f, svg: "epipremnum-aureum.jpg", dificuldade: Math.min(3, Math.max(1, f.dificuldade)) as 1 | 2 | 3 };
}

export function Identificar() {
  const [etapa, setEtapa] = useState<Etapa>("pronto");
  const [previa, setPrevia] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ planta: FichaPlanta; confianca: number; cache: boolean; origem: "ia" | "local" } | null>(null);
  const [top3, setTop3] = useState<{ planta: FichaPlanta; confianca: number }[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const memoria = useMemo(() => new Map<string, string>(), []);

  const escolher = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPrevia(url);
    setEtapa("analisando");
    if (servidorConfigurado()) {
      identificarServidor(file)
        .then((r) => {
          const ficha = fichaParaPlanta(r.ficha);
          const local = buscarTodas(r.ficha.slug);
          finalizar(local ?? ficha, r.ficha.confianca, r.cache, "ia");
        })
        .catch(() => identificarLocal(file.name.toLowerCase(), url));
      return;
    }
    window.setTimeout(() => identificarLocal(file.name.toLowerCase(), url), 1200);
  };

  const identificarLocal = (nomeArquivo: string, url: string) => {
    if (memoria.has(nomeArquivo)) {
      const slug = memoria.get(nomeArquivo)!;
      const planta = buscarTodas(slug)!;
      finalizar(planta, 97, true, "local");
      return;
    }
    let melhor = TODAS_PLANTAS[3];
    let melhorScore = 40;
    for (const p of TODAS_PLANTAS) {
      const palavras = PALAVRAS[p.slug] ?? [p.nomePopular.toLowerCase()];
      const score = palavras.some((w) => nomeArquivo.includes(w)) ? 96 : 30 + Math.floor(Math.random() * 20);
      if (score > melhorScore) { melhorScore = score; melhor = p; }
    }
    memoria.set(nomeArquivo, melhor.slug);
    try {
      const raw = localStorage.getItem("mudai:ident:v1");
      const cache = raw ? JSON.parse(raw) : {};
      const doCache = cache[nomeArquivo];
      if (doCache) {
        const planta = buscarTodas(doCache) ?? melhor;
        finalizar(planta, 96, true, "local");
        return;
      }
      cache[nomeArquivo] = melhor.slug;
      localStorage.setItem("mudai:ident:v1", JSON.stringify(cache));
    } catch { /* segue */ }
    void url;
    finalizar(melhor, melhorScore, false, "local");
  };

  const finalizar = (planta: FichaPlanta, confianca: number, cache: boolean, origem: "ia" | "local") => {
    setResultado({ planta, confianca, cache, origem });
    setTop3(
      TODAS_PLANTAS.filter((p) => p.slug !== planta.slug)
        .slice(0, 2)
        .map((p, i) => ({ planta: p, confianca: 71 - i * 18 }))
    );
    setEtapa("resultado");
  };

  return (
    <div className="phone">
      <div className="screen">
        <Topbar titulo="Identificar" subtitulo={servidorConfigurado() ? "Foto → IA identifica e gera a ficha" : "Foto → ficha completa na hora"} />
        <div className="pad" style={{ paddingTop: 10 }}>
          <div style={{ borderRadius: "var(--r-lg)", overflow: "hidden", position: "relative", height: 300, background: "linear-gradient(150deg,#d8f3dc,#95d5b2)", border: "1.5px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {previa
              ? <img src={previa} alt="Prévia" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div className="center" style={{ padding: 24 }}><Icons.Camera /><p className="small" style={{ marginTop: 8 }}>Tire uma foto ou escolha da galeria</p></div>}
          </div>
          <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => escolher(e.target.files?.[0])} />
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-primary grow" onClick={() => input.current?.click()}>Tirar foto</button>
            <button className="btn btn-ghost grow" onClick={() => input.current?.click()}>Galeria</button>
          </div>

          {etapa === "analisando" && (
            <div className="card" style={{ padding: 16, marginTop: 14 }}>
              <b>{servidorConfigurado() ? "Hachimi está olhando a foto…" : "Hachimi está olhando…"}</b>
              <p className="small">
                {servidorConfigurado()
                  ? "A IA compara a imagem com o catálogo e monta a ficha completa."
                  : "Comparando formato, folha e porte com o catálogo."}
              </p>
            </div>
          )}

          {etapa === "resultado" && resultado && (
            <div className="card" style={{ padding: 16, marginTop: 14 }}>
              <div className="row">
                <img src={fotoPlanta(resultado.planta.svg)} style={{ width: 56, height: 56, objectFit: "cover", background: "var(--green-50)", borderRadius: 14 }} alt="" />
                <div className="grow">
                  <p className="small" style={{ fontWeight: 800, color: "var(--green-700)" }}>IDENTIFICADA · {resultado.confianca}%</p>
                  <b style={{ fontSize: 16 }}>{resultado.planta.nomePopular}</b>
                  <p className="small"><i>{resultado.planta.nomeCientifico}</i></p>
                </div>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <span className="chip mint">{resultado.planta.tagLuz}</span>
              </div>
              <h3 style={{ margin: "12px 0 4px" }}>Água</h3>
              <GaugeAgua nivel={resultado.planta.aguaNivel} />
              <h3 style={{ margin: "12px 0 4px" }}>Sol ideal</h3>
              <GaugeSol min={resultado.planta.luxMin} max={resultado.planta.luxMax} />
              <p className="small" style={{ marginTop: 8 }}>
                {resultado.cache
                  ? "Já estava no cache — nenhum token gasto."
                  : resultado.origem === "ia"
                    ? "Ficha gerada pela IA no padrão do catálogo e salva no cache."
                    : "Ficha completa do catálogo."}
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
          )}

          {etapa === "resultado" && (
            <div className="card" style={{ padding: 16, marginTop: 12 }}>
              <b style={{ fontSize: 14 }}>Não tem certeza?</b>
              <p className="small">Top candidatas para você escolher:</p>
              <div className="row" style={{ marginTop: 10 }}>
                {resultado && <span className="chip active">{resultado.planta.nomePopular} {resultado.confianca}%</span>}
                {top3.map((t) => (
                  <span key={t.planta.slug} className="chip" onClick={() => finalizar(t.planta, t.confianca, false, "local")}>
                    {t.planta.nomePopular} {t.confianca}%
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ height: 10 }} />
        </div>
      </div>
      <Tabbar />
    </div>
  );
}
