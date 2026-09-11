const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export const BASE_API = BASE;

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
  catalogo?: { slug: string; novo: boolean } | null;
}

/**
 * Resolve o endereço de uma foto de planta.
 * - Foto empacotada no app (ex.: "jiboia.svg") vem dos assets locais.
 * - Foto cadastrada no servidor (ex.: "/uploads/x.jpg") vem do domínio da API.
 */
export function urlFoto(foto: string): string {
  if (!foto) return "";
  if (/^https?:\/\//i.test(foto)) return foto;
  if (foto.startsWith("/")) return `${BASE}${foto}`;
  return `${BASE}/plantas/${foto}`;
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
    signal: AbortSignal.timeout(120000),
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
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`chat ${res.status}`);
  const dados = (await res.json()) as { resposta: string };
  return dados.resposta;
}

export async function saudeServidor(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

/* ----------------------- Painel admin ----------------------- */

const CHAVE_TOKEN = "mudai:admin-token";

export function tokenAdmin(): string {
  try {
    return localStorage.getItem(CHAVE_TOKEN) ?? "";
  } catch {
    return "";
  }
}

export function salvarTokenAdmin(token: string): void {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* ignora */
  }
}

async function chamarAdmin(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = tokenAdmin();
  return fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { ...(init.headers ?? {}), "x-admin-token": token },
    signal: AbortSignal.timeout(30000),
  });
}

export async function validarToken(): Promise<boolean> {
  try {
    const res = await chamarAdmin("/api/v1/admin/sessao");
    return res.ok;
  } catch {
    return false;
  }
}

export async function salvarPlanta(dados: Record<string, unknown>): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await chamarAdmin("/api/v1/admin/plantas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (res.ok) return { ok: true };
    const corpo = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, erro: corpo.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function removerPlanta(slug: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await chamarAdmin(`/api/v1/admin/plantas/${slug}`, { method: "DELETE" });
    if (res.ok) return { ok: true };
    return { ok: false, erro: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function enviarFoto(arquivo: File): Promise<{ ok: boolean; foto?: string; erro?: string }> {
  try {
    const dados = new FormData();
    dados.append("foto", arquivo);
    const res = await chamarAdmin("/api/v1/admin/foto", { method: "POST", body: dados });
    if (!res.ok) return { ok: false, erro: `HTTP ${res.status}` };
    const corpo = (await res.json()) as { foto: string };
    return { ok: true, foto: corpo.foto };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
