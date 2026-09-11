import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface Cuidado {
  titulo: string;
  texto: string;
}

export interface Planta {
  slug: string;
  nomePopular: string;
  nomeCientifico: string;
  descricao: string;
  foto: string;
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
  cuidados: Cuidado[];
  sinais: { feliz: string[]; estresse: string[] };
  curiosidades: string[];
  origem?: string;
  atualizadoEm?: string;
}

interface ArquivoCatalogo {
  versao: number;
  atualizadoEm: string;
  plantas: Planta[];
}

const AQUI = dirname(fileURLToPath(import.meta.url));
const SEED = join(AQUI, "dados", "catalogo.seed.json");

export class Catalogo {
  private caminho: string;
  private dados: ArquivoCatalogo;
  private pendente: NodeJS.Timeout | null = null;

  constructor(storageDir: string) {
    this.caminho = join(storageDir, "catalogo.json");
    this.dados = this.carregar();
  }

  private carregar(): ArquivoCatalogo {
    mkdirSync(dirname(this.caminho), { recursive: true });
    if (existsSync(this.caminho)) {
      try {
        const lido = JSON.parse(readFileSync(this.caminho, "utf8")) as ArquivoCatalogo;
        if (Array.isArray(lido.plantas) && lido.plantas.length > 0) return lido;
      } catch {
        /* arquivo corrompido: recria a partir do seed */
      }
    }
    const seed = JSON.parse(readFileSync(SEED, "utf8")) as { plantas: Planta[] };
    const inicial: ArquivoCatalogo = {
      versao: 1,
      atualizadoEm: new Date().toISOString(),
      plantas: seed.plantas,
    };
    this.escrever(inicial);
    return inicial;
  }

  private escrever(dados: ArquivoCatalogo): void {
    const tmp = `${this.caminho}.tmp`;
    writeFileSync(tmp, JSON.stringify(dados, null, 1), "utf8");
    renameSync(tmp, this.caminho);
  }

  /** Grava em disco de forma agrupada, evitando escrita a cada requisição. */
  private agendarGravacao(): void {
    if (this.pendente) clearTimeout(this.pendente);
    this.pendente = setTimeout(() => {
      this.dados.atualizadoEm = new Date().toISOString();
      this.escrever(this.dados);
      this.pendente = null;
    }, 400);
  }

  listar(): Planta[] {
    return this.dados.plantas;
  }

  buscar(slug: string): Planta | undefined {
    return this.dados.plantas.find((p) => p.slug === slug);
  }

  total(): number {
    return this.dados.plantas.length;
  }

  versao(): string {
    return `${this.dados.plantas.length}-${this.dados.atualizadoEm}`;
  }

  criar(planta: Planta): Planta {
    if (this.buscar(planta.slug)) throw new Error("SLUG_JA_EXISTE");
    const nova: Planta = { ...planta, origem: "admin", atualizadoEm: new Date().toISOString() };
    this.dados.plantas.unshift(nova);
    this.agendarGravacao();
    return nova;
  }

  atualizar(slug: string, mudancas: Partial<Planta>): Planta {
    const i = this.dados.plantas.findIndex((p) => p.slug === slug);
    if (i < 0) throw new Error("NAO_ENCONTRADA");
    const atualizada: Planta = {
      ...this.dados.plantas[i],
      ...mudancas,
      slug: this.dados.plantas[i].slug,
      atualizadoEm: new Date().toISOString(),
    };
    this.dados.plantas[i] = atualizada;
    this.agendarGravacao();
    return atualizada;
  }

  remover(slug: string): void {
    const antes = this.dados.plantas.length;
    this.dados.plantas = this.dados.plantas.filter((p) => p.slug !== slug);
    if (this.dados.plantas.length === antes) throw new Error("NAO_ENCONTRADA");
    this.agendarGravacao();
  }
}

export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
