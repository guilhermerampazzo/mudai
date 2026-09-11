const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export interface FichaIA {
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
  dificuldade: 1 | 2 | 3;
  porte: string;
  toxicaPets: boolean;
  tags: string[];
  tagLuz: string;
  cuidados: { titulo: string; texto: string }[];
  sinais: { feliz: string[]; estresse: string[] };
  curiosidades: string[];
  confianca: number;
}

export interface RespostaIdentificar {
  cache: boolean;
  arquivoUrl: string;
  ficha: FichaIA;
}

export function servidorConfigurado(): boolean {
  return BASE.length > 0;
}

export async function identificarServidor(file: File): Promise<RespostaIdentificar> {
  const dados = new FormData();
  dados.append("imagem", file);
  const res = await fetch(`${BASE}/api/v1/identificar`, {
    method: "POST",
    body: dados,
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`identificar ${res.status}`);
  return (await res.json()) as RespostaIdentificar;
}

export async function chatServidor(
  mensagem: string,
  pets: { apelido: string; especie: string; local: string }[],
  historico: { role: "user" | "assistant"; texto: string }[]
): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mensagem, pets, historico }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`chat ${res.status}`);
  const dados = (await res.json()) as { resposta: string };
  return dados.resposta;
}

export async function saudeServidor(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
