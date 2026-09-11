import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";

export interface Conta {
  id: string;
  email: string;
  nome: string;
  criadaEm: string;
  verificado: boolean;
  codigo?: string;
  codigoExpira?: string;
  codigoTentativas?: number;
  token?: string;
  ultimoAcesso?: string;
}

export interface Uso {
  chat: string[];
  visao: string[];
}

export interface Limites {
  chatDia: number;
  chatSemana: number;
  visaoSemana: number;
}

/** Lido a cada chamada: o .env carrega depois dos imports. */
export function limitesAtuais(): Limites {
  return {
    chatDia: Number(process.env.LIMITE_CHAT_DIA ?? 10),
    chatSemana: Number(process.env.LIMITE_CHAT_SEMANA ?? 50),
    visaoSemana: Number(process.env.LIMITE_VISAO_SEMANA ?? 20),
  };
}

interface Arquivo {
  versao: number;
  contas: Conta[];
}

const DIA = 24 * 60 * 60 * 1000;
const SEMANA = 7 * DIA;

/**
 * Contas de usuário, códigos de verificação e histórico de uso.
 * Tudo em um JSON no volume — o app é gratuito e sem senha (só e-mail verificado).
 */
export class Contas {
  private caminho: string;
  private dados: Arquivo;
  private pendente: NodeJS.Timeout | null = null;

  constructor(storageDir: string) {
    mkdirSync(storageDir, { recursive: true });
    this.caminho = join(storageDir, "contas.json");
    this.dados = existsSync(this.caminho)
      ? (JSON.parse(readFileSync(this.caminho, "utf8")) as Arquivo)
      : { versao: 1, contas: [] };
    if (!Array.isArray(this.dados.contas)) this.dados.contas = [];
  }

  private agendar(): void {
    if (this.pendente) clearTimeout(this.pendente);
    this.pendente = setTimeout(() => {
      const tmp = `${this.caminho}.tmp`;
      writeFileSync(tmp, JSON.stringify(this.dados, null, 1), "utf8");
      renameSync(tmp, this.caminho);
      this.pendente = null;
    }, 300);
  }

  private porEmail(email: string): Conta | undefined {
    const alvo = email.trim().toLowerCase();
    return this.dados.contas.find((c) => c.email === alvo);
  }

  private porToken(token: string): Conta | undefined {
    return this.dados.contas.find((c) => c.token === token);
  }

  criarConta(email: string, nome: string): { conta: Conta; novo: boolean } {
    const alvo = email.trim().toLowerCase();
    const existente = this.porEmail(alvo);
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    if (existente) {
      existente.codigo = codigo;
      existente.codigoExpira = expira;
      existente.codigoTentativas = 0;
      if (nome.trim()) existente.nome = nome.trim();
      this.agendar();
      return { conta: existente, novo: false };
    }

    const conta: Conta = {
      id: randomUUID(),
      email: alvo,
      nome: nome.trim() || alvo.split("@")[0],
      criadaEm: new Date().toISOString(),
      verificado: false,
      codigo,
      codigoExpira: expira,
      codigoTentativas: 0,
    };
    this.dados.contas.push(conta);
    this.agendar();
    return { conta, novo: true };
  }

  /** Sessão anônima: permite usar o app sem conta, com limites próprios. */
  criarAnonimo(): Conta {
    const conta: Conta = {
      id: randomUUID(),
      email: `anon-${randomUUID().slice(0, 8)}@local`,
      nome: "Visitante",
      criadaEm: new Date().toISOString(),
      verificado: false,
      token: randomUUID(),
    };
    this.dados.contas.push(conta);
    this.agendar();
    return conta;
  }

  verificar(email: string, codigo: string): { ok: boolean; token?: string; erro?: string } {
    const conta = this.porEmail(email);
    if (!conta) return { ok: false, erro: "Conta não encontrada." };
    if (!conta.codigo || !conta.codigoExpira) return { ok: false, erro: "Peça um código novo." };
    if (new Date(conta.codigoExpira).getTime() < Date.now()) return { ok: false, erro: "O código expirou. Peça outro." };

    conta.codigoTentativas = (conta.codigoTentativas ?? 0) + 1;
    if (conta.codigoTentativas > 6) {
      conta.codigo = undefined;
      this.agendar();
      return { ok: false, erro: "Muitas tentativas. Peça um código novo." };
    }
    if (conta.codigo !== codigo.trim()) {
      this.agendar();
      return { ok: false, erro: "Código errado." };
    }

    conta.verificado = true;
    conta.token = randomUUID();
    conta.ultimoAcesso = new Date().toISOString();
    conta.codigo = undefined;
    conta.codigoExpira = undefined;
    conta.codigoTentativas = 0;
    this.agendar();
    return { ok: true, token: conta.token };
  }

  porSessao(token: string | undefined): Conta | undefined {
    if (!token) return undefined;
    const conta = this.porToken(token);
    if (conta) conta.ultimoAcesso = new Date().toISOString();
    return conta;
  }

  sair(token: string): void {
    const conta = this.porToken(token);
    if (conta && conta.email.includes("@local")) {
      this.dados.contas = this.dados.contas.filter((c) => c.id !== conta.id);
    } else if (conta) {
      conta.token = undefined;
    }
    this.agendar();
  }

  /* ------------------------- limites de uso ------------------------- */

  private usoDa(conta: Conta): Uso {
    const bruto = (conta as unknown as { uso?: Uso }).uso;
    return bruto && Array.isArray(bruto.chat) && Array.isArray(bruto.visao) ? bruto : { chat: [], visao: [] };
  }

  private gravarUso(conta: Conta, uso: Uso): void {
    const agora = Date.now();
    uso.chat = uso.chat.filter((t) => agora - new Date(t).getTime() < SEMANA);
    uso.visao = uso.visao.filter((t) => agora - new Date(t).getTime() < SEMANA);
    (conta as unknown as { uso: Uso }).uso = uso;
    this.agendar();
  }

  consultarLimites(conta: Conta): {
    limites: Limites;
    chatHoje: number;
    chatSemana: number;
    visaoSemana: number;
    podeChat: boolean;
    podeVisao: boolean;
    verificado: boolean;
  } {
    const limites = limitesAtuais();
    const uso = this.usoDa(conta);
    const agora = Date.now();
    const dia = uso.chat.filter((t) => agora - new Date(t).getTime() < DIA).length;
    const semana = uso.chat.filter((t) => agora - new Date(t).getTime() < SEMANA).length;
    const visao = uso.visao.filter((t) => agora - new Date(t).getTime() < SEMANA).length;
    return {
      limites,
      chatHoje: dia,
      chatSemana: semana,
      visaoSemana: visao,
      podeChat: dia < limites.chatDia && semana < limites.chatSemana,
      podeVisao: visao < limites.visaoSemana,
      verificado: Boolean(conta.verificado),
    };
  }

  registrarChat(conta: Conta): void {
    const uso = this.usoDa(conta);
    uso.chat.push(new Date().toISOString());
    this.gravarUso(conta, uso);
  }

  registrarVisao(conta: Conta): void {
    const uso = this.usoDa(conta);
    uso.visao.push(new Date().toISOString());
    this.gravarUso(conta, uso);
  }

  /** Impressão digital do aparelho, para não burlar limite apagando o app. */
  static digital(aparelho: string): string {
    return createHash("sha256").update(`mudai:${aparelho}`).digest("hex").slice(0, 24);
  }

  quantidade(): number {
    return this.dados.contas.filter((c) => !c.email.includes("@local")).length;
  }
}
