import { PLANTAS, TAG_FILTROS, filtrarPlantas, buscarPlanta, type FichaPlanta } from "./plantas";
import { PLANTAS_9_200, type FichaLite } from "./plantas200";

export type { FichaPlanta };

function liteParaFicha(l: FichaLite): FichaPlanta {
  const aguaMapa = { pouca: 1, moderada: 3, muita: 4 } as const;
  const freqMapa: Record<FichaLite["agua"], [number, number]> = {
    pouca: [12, 20],
    moderada: [5, 8],
    muita: [2, 4],
  };
  const luxMapa: Record<FichaLite["luz"], [number, number]> = {
    sombra: [400, 1500],
    "meia-sombra": [1000, 4000],
    "luz-indireta-brilhante": [2500, 10000],
    "sol-pleno": [15000, 45000],
  };
  const freq = freqMapa[l.agua];
  const [luxMin, luxMax] = luxMapa[l.luz];
  const tagLuz =
    l.luz === "sombra" ? "Sombra" : l.luz === "meia-sombra" ? "Meia-sombra" : l.luz === "sol-pleno" ? "Sol pleno" : "Luz indireta";
  const tags = [l.luz, l.agua === "pouca" ? "pouca-agua" : l.agua === "muita" ? "muita-agua" : "agua-moderada"];
  if (l.dificuldade === 1) tags.push("iniciante");
  if (l.dificuldade === 2) tags.push("intermediario");
  if (l.dificuldade === 3) tags.push("avancado");
  return {
    slug: l.slug,
    nomePopular: l.nome,
    nomeCientifico: l.sci,
    descricao: l.desc,
    svg: `${l.foto}.jpg`,
    aguaNivel: aguaMapa[l.agua],
    aguaFreqDias: freq,
    luxMin,
    luxMax,
    tempMin: 18,
    tempMax: 30,
    umidadeMin: l.agua === "muita" ? 60 : 40,
    umidadeMax: l.agua === "pouca" ? 55 : 80,
    dificuldade: l.dificuldade,
    porte: "Porte médio",
    toxicaPets: false,
    tags,
    tagLuz,
    cuidados: [
      { titulo: "Rega", texto: `Regue a cada ${freq[0]}–${freq[1]} dias, ajustando ao clima.` },
      { titulo: "Luz", texto: `Prefere ${tagLuz.toLowerCase()}. Observe as folhas e ajuste o local.` },
      { titulo: "Rotina", texto: "Adube leve na primavera e limpe as folhas mensalmente." },
    ],
    sinais: {
      feliz: ["Folhas firmes e cor viva", "Brotação regular"],
      estresse: ["Folha amarela: cheque água e luz", "Ponta seca: ar muito seco"],
    },
    curiosidades: [l.desc],
  };
}

const COMPLETO: FichaPlanta[] = [...PLANTAS, ...PLANTAS_9_200.map(liteParaFicha)];

export const TODAS_PLANTAS = COMPLETO;

export function fotoPlanta(svg: string): string {
  return svg.endsWith(".jpg") ? `/plantas/${svg}` : `/plantas/${svg}`;
}

export function filtrarTodas(filtro: string): FichaPlanta[] {
  if (filtro === "Todas") return COMPLETO;
  const mapa: Record<string, string> = {
    "Sol pleno": "sol-pleno",
    "Meia-sombra": "meia-sombra",
    "Pouca água": "pouca-agua",
    "Pet-safe": "segura-pets",
    Iniciante: "iniciante",
  };
  const tag = mapa[filtro];
  return COMPLETO.filter((p) => p.tags.includes(tag));
}

export function buscarTodas(slug: string): FichaPlanta | undefined {
  return COMPLETO.find((p) => p.slug === slug);
}

export { TAG_FILTROS, filtrarPlantas, buscarPlanta };
