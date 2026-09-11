import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TODAS_PLANTAS, type FichaPlanta } from "../data/plantasIndex";
import { BASE_API, servidorConfigurado } from "./api";

const CHAVE = "mudai:catalogo:v2";

interface EmCache {
  versao: string;
  plantas: FichaPlanta[];
}

interface CatalogoValor {
  plantas: FichaPlanta[];
  origem: "servidor" | "local";
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
  buscar: (slug: string) => FichaPlanta | undefined;
}

const Contexto = createContext<CatalogoValor | null>(null);

function lerCache(): EmCache | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const lido = JSON.parse(bruto) as EmCache;
    if (!Array.isArray(lido.plantas) || lido.plantas.length === 0) return null;
    return lido;
  } catch {
    return null;
  }
}

function gravarCache(versao: string, plantas: FichaPlanta[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ versao, plantas }));
  } catch {
    /* sem espaço: segue sem cache */
  }
}

export function CatalogoProvider({ children }: { children: React.ReactNode }) {
  const cache = useMemo(lerCache, []);
  const [plantas, setPlantas] = useState<FichaPlanta[]>(cache?.plantas ?? TODAS_PLANTAS);
  const [origem, setOrigem] = useState<"servidor" | "local">(cache ? "servidor" : "local");
  const [carregando, setCarregando] = useState(servidorConfigurado());
  const [erro, setErro] = useState<string | null>(null);
  const [gatilho, setGatilho] = useState(0);

  useEffect(() => {
    if (!servidorConfigurado()) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);

    fetch(`${BASE_API}/api/v1/catalogo`, { signal: AbortSignal.timeout(15000) })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ versao: string; plantas: FichaPlanta[] }>;
      })
      .then((dados) => {
        if (!ativo || !Array.isArray(dados.plantas) || dados.plantas.length === 0) return;
        // O servidor usa "foto"; o app trabalha com "svg" em todas as telas.
        const normalizadas = dados.plantas.map((p) => ({
          ...p,
          svg: (p as unknown as { foto?: string }).foto ?? p.svg,
        })) as FichaPlanta[];
        const anterior = lerCache();
        if (anterior?.versao !== dados.versao) gravarCache(dados.versao, normalizadas);
        setPlantas(normalizadas);
        setOrigem("servidor");
        setErro(null);
      })
      .catch((e: Error) => {
        if (ativo) setErro(e.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [gatilho]);

  const recarregar = useCallback(() => setGatilho((g) => g + 1), []);
  const buscar = useCallback((slug: string) => plantas.find((p) => p.slug === slug), [plantas]);

  const valor = useMemo(
    () => ({ plantas, origem, carregando, erro, recarregar, buscar }),
    [plantas, origem, carregando, erro, recarregar, buscar]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCatalogo(): CatalogoValor {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCatalogo precisa do CatalogoProvider");
  return ctx;
}

export function filtrarPorTag(plantas: FichaPlanta[], filtro: string): FichaPlanta[] {
  if (filtro === "Todas") return plantas;
  const mapa: Record<string, string> = {
    "Sol pleno": "sol-pleno",
    "Meia-sombra": "meia-sombra",
    "Pouca água": "pouca-agua",
    "Pet-safe": "segura-pets",
    Iniciante: "iniciante",
  };
  const tag = mapa[filtro];
  return plantas.filter((p) => p.tags.includes(tag));
}
