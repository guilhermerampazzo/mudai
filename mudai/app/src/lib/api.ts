const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export const BASE_API = BASE;

/* ------------------------- tipos ------------------------- */

export interface Uso {
  limites: { chatDia: number; chatSemana: number; visaoSemana: number };
  chatHoje: number;
  chatSemana: number;
  visaoSemana: number;
  podeChat: boolean;
  podeVisao: boolean;
  verificado: boolean;
}

export interface Usuario {
  id: string;
  email: string | null;
  nome: string;
  verificado: boolean;
  criadaEm: string;
}

export interface Candidato {
  nomePopular: string;
  nomeCientifico: string;
  confianca: number;
  porque: string;
}

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
  confianca?: number;
}

export interface RespostaIdentificar {
  cache: boolean;
  arquivoUrl: string;
  candidatos: Candidato[];
  precisaRevisao: boolean;
  ficha: FichaIA;
  catalogo?: { slug: string; novo: boolean } | null;
  uso?: Uso;
}

/** Erro vindo da API, com o código para a tela decidir o que mostrar. */
export class ErroAPI extends Error {
  code: string;
  uso?: Uso;

  constructor(code: string, message: string, uso?: Uso) {
    super(message);
    this.code = code;
    this.uso = uso;
  }
}

/* ------------------------- foto ------------------------- */

/**
 * Resolve o endereço da foto de uma planta.
 * Foto empacotada no app vem dos assets; foto enviada ao servidor vem do domínio.
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

/* ------------------------- sessão ------------------------- */

const CHAVE_SESSAO = "mudai:sessao";

export function sessaoToken(): string {
  try {
    return localStorage.getItem(CHAVE_SESSAO) ?? "";
  } catch {
    return "";
  }
}

export function salvarSessao(token: string): void {
  try {
    if (token) localStorage.setItem(CHAVE_SESSAO, token);
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* ignora */
  }
}

function cabecalhos(extra?: Record<string, string>): Record<string, string> {
  const t = sessaoToken();
  return { ...(t ? { "x-sessao": t } : {}), ...(extra ?? {}) };
}

async function tratar<T>(res: Response, rotulo: string): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let corpo: { code?: string; message?: string; uso?: Uso } = {};
  try {
    corpo = (await res.json()) as typeof corpo;
  } catch {
    /* resposta sem JSON */
  }
  throw new ErroAPI(corpo.code ?? `ERRO_${res.status}`, corpo.message ?? `Falhou (${rotulo} ${res.status})`, corpo.uso);
}

/* ------------------------- conta ------------------------- */

export async function criarConta(email: string, nome: string): Promise<{ novo: boolean; mensagem: string }> {
  const res = await fetch(`${BASE}/api/v1/conta/codigo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, nome }),
    signal: AbortSignal.timeout(40000),
  });
  return tratar<{ novo: boolean; mensagem: string }>(res, "conta");
}

export async function verificarCodigo(email: string, codigo: string): Promise<{ token: string; conta: Usuario }> {
  const res = await fetch(`${BASE}/api/v1/conta/verificar`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, codigo }),
    signal: AbortSignal.timeout(40000),
  });
  const dados = await tratar<{ token: string; conta: Usuario }>(res, "verificar");
  salvarSessao(dados.token);
  return dados;
}

export async function buscarConta(): Promise<{ conta: Usuario; uso: Uso } | null> {
  if (!sessaoToken()) return null;
  try {
    const res = await fetch(`${BASE}/api/v1/conta/eu`, {
      headers: cabecalhos(),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return (await res.json()) as { conta: Usuario; uso: Uso };
  } catch {
    return null;
  }
}

export async function sairConta(): Promise<void> {
  try {
    await fetch(`${BASE}/api/v1/conta/sair`, {
      method: "POST",
      headers: cabecalhos(),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    /* sai localmente mesmo assim */
  }
  salvarSessao("");
}

/* ------------------------- IA ------------------------- */

export async function identificarServidor(file: File): Promise<RespostaIdentificar> {
  const dados = new FormData();
  dados.append("imagem", file);
  const res = await fetch(`${BASE}/api/v1/identificar`, {
    method: "POST",
    headers: cabecalhos(),
    body: dados,
    signal: AbortSignal.timeout(150000),
  });
  return tratar<RespostaIdentificar>(res, "identificar");
}

export async function chatServidor(
  mensagem: string,
  pets: { apelido: string; especie: string; local: string }[],
  historico: { role: "user" | "assistant"; texto: string }[]
): Promise<{ resposta: string; uso?: Uso }> {
  const res = await fetch(`${BASE}/api/v1/chat`, {
    method: "POST",
    headers: cabecalhos({ "content-type": "application/json" }),
    body: JSON.stringify({ mensagem, pets, historico }),
    signal: AbortSignal.timeout(150000),
  });
  return tratar<{ resposta: string; uso?: Uso }>(res, "chat");
}

export async function saudeServidor(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

/* ------------------------- painel admin ------------------------- */

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
  return fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { ...(init.headers ?? {}), "x-admin-token": tokenAdmin() },
    signal: AbortSignal.timeout(40000),
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
