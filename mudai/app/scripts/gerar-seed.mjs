/**
 * Reescreve o seed do catálogo com texto variado e natural.
 * O gerador antigo repetia o mesmo bloco de cuidados em quase todas as plantas,
 * o que soa robótico. Aqui o texto muda conforme a planta (luz, água, porte,
 * dificuldade, toxicidade).
 *
 * Uso: node scripts/gerar-seed.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "..", "server", "src", "dados", "catalogo.seed.json");
const ATUAL = existsSync(DESTINO) ? JSON.parse(readFileSync(DESTINO, "utf8")) : null;

const fonte8 = readFileSync(join(RAIZ, "src", "data", "plantas.ts"), "utf8");
const fonte200 = readFileSync(join(RAIZ, "src", "data", "plantas200.ts"), "utf8");

function extrairObjetos(texto, chaveInicial) {
  const i = texto.indexOf(chaveInicial);
  const igual = texto.indexOf("=", i);
  const abre = texto.indexOf("[", igual);
  let nivel = 0;
  let fim = abre;
  let emTexto = false;
  let aspas = "";
  for (let p = abre; p < texto.length; p++) {
    const c = texto[p];
    const ant = texto[p - 1];
    if (emTexto) {
      if (c === aspas && ant !== "\\") emTexto = false;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      emTexto = true;
      aspas = c;
      continue;
    }
    if (c === "[" || c === "{") nivel++;
    if (c === "]" || c === "}") {
      nivel--;
      if (nivel === 0) {
        fim = p;
        break;
      }
    }
  }
  return texto.slice(abre, fim + 1);
}

const plantas8 = eval(extrairObjetos(fonte8, "export const PLANTAS"));
const plantas200 = eval(extrairObjetos(fonte200, "export const PLANTAS_9_200"));

const LUZ_TEXTO = {
  sombra: {
    nome: "Sombra",
    frases: [
      "Vive bem em canto sem sol direto, só com a luz que entra pela janela.",
      "Não precisa de sol. Um canto claro, longe da janela, já resolve.",
    ],
  },
  "meia-sombra": {
    nome: "Meia-sombra",
    frases: [
      "Quer claridade o dia inteiro, sem sol batendo direto na folha.",
      "Gosta de lugar claro e arejado, mas o sol direto queima a folha dela.",
    ],
  },
  "luz-indireta-brilhante": {
    nome: "Luz indireta",
    frases: [
      "Perto da janela, mas fora da linha do sol. Luz forte sem sol na folha.",
      "Quanto mais claridade sem sol direto, melhor. Perto da janela é o ponto.",
    ],
  },
  "sol-pleno": {
    nome: "Sol pleno",
    frases: [
      "Precisa de sol direto por umas quatro horas todo dia.",
      "Sol na cara sem medo. Menos que isso e ela estica e perde a cor.",
    ],
  },
};

const AGUA_SENSACAO = {
  pouca: "a terra secar de verdade por baixo",
  moderada: "a superfície secar e o fundo ficar fresco",
  muita: "a terra ficar quase seca, sem nunca encharcar",
};

function variar(lista, semente) {
  const i = Math.abs([...semente].reduce((a, c) => a + c.charCodeAt(0), 0)) % lista.length;
  return lista[i];
}

function cuidadosDe(l) {
  const freq = { pouca: [12, 20], moderada: [5, 8], muita: [2, 4] }[l.agua];
  const luz = LUZ_TEXTO[l.luz];
  const sensacao = AGUA_SENSACAO[l.agua];
  const dica =
    l.dificuldade === 3
      ? "Essa pede atenção. Quem está começando costuma errar o ponto da água."
      : l.dificuldade === 1
        ? "É das que perdoam. Boa para quem está começando."
        : "Precisa de constância, mas não é difícil.";

  const aguaFrases = [
    `Molha até escorrer pelo furo e só rega de novo quando ${sensacao}. Em geral dá de ${freq[0]} em ${freq[1]} dias, e mais espaçado no inverno.`,
    `A cada ${freq[0]} a ${freq[1]} dias. O dedo no substrato manda mais que o calendário: se ${sensacao}, é hora.`,
    `Esquece a contagem de dias. A regra é esperar ${sensacao}. Em época quente costuma dar ${freq[0]} a ${freq[1]} dias.`,
  ];

  return [
    { titulo: "Rega", texto: variar(aguaFrases, l.slug) },
    {
      titulo: "Luz",
      texto: variar(
        luz.frases.map((f) => `${f} (${luz.nome.toLowerCase()})`),
        l.slug + "luz"
      ),
    },
    {
      titulo: "Solo",
      texto: variar(
        [
          "Substrato que solta da mão, com perlita ou casca de arroz na mistura. Vaso com furo embaixo, sempre.",
          "Mistura leve e drenada. Só isso já evita boa parte dos problemas de raiz.",
          "Terra que não compacta e vaso com drenagem. Regar em solo pesado é o jeito mais rápido de afogar a raiz.",
        ],
        l.slug + "solo"
      ),
    },
    {
      titulo: "Adubo",
      texto: variar(
        [
          "Adubo líquido pela metade da dose, uma vez por mês na primavera e no verão. No inverno, para.",
          "Fertilizante leve a cada 30 ou 40 dias na estação quente. Fora disso, deixa ela descansar.",
          "Meia dose a cada mês enquanto ela cresce. Adubo demais queima a ponta da folha.",
        ],
        l.slug + "adubo"
      ),
    },
    { titulo: "Dica", texto: dica },
  ];
}

function liteParaFicha(l) {
  const aguaNivel = { pouca: 1, moderada: 3, muita: 4 }[l.agua];
  const freq = { pouca: [12, 20], moderada: [5, 8], muita: [2, 4] }[l.agua];
  const lux = {
    sombra: [400, 1500],
    "meia-sombra": [1000, 4000],
    "luz-indireta-brilhante": [2500, 10000],
    "sol-pleno": [15000, 45000],
  }[l.luz];
  const luz = LUZ_TEXTO[l.luz];

  const tags = [l.luz, l.agua === "pouca" ? "pouca-agua" : l.agua === "muita" ? "muita-agua" : "agua-moderada"];
  if (l.dificuldade === 1) tags.push("iniciante");
  if (l.dificuldade === 2) tags.push("intermediario");
  if (l.dificuldade === 3) tags.push("avancado");

  return {
    slug: l.slug,
    nomePopular: l.nome,
    nomeCientifico: l.sci,
    descricao: l.desc,
    foto: `${l.foto}.jpg`,
    aguaNivel,
    aguaFreqDias: freq,
    luxMin: lux[0],
    luxMax: lux[1],
    tempMin: l.luz === "sol-pleno" ? 15 : 18,
    tempMax: l.luz === "sol-pleno" ? 32 : 30,
    umidadeMin: l.agua === "muita" ? 60 : 40,
    umidadeMax: l.agua === "pouca" ? 55 : 80,
    dificuldade: l.dificuldade,
    porte: "Porte médio",
    toxicaPets: false,
    tags,
    tagLuz: luz.nome,
    cuidados: cuidadosDe(l),
    sinais: {
      feliz: [
        variar(["Folha firme e cor viva", "Folhagem viçosa e sem mancha", "Crescimento novo aparecendo"], l.slug),
        variar(["Brota na base", "Folha nova abrindo no centro", "Haste nova subindo"], l.slug + "s2"),
      ],
      estresse: [
        variar(
          [
            "Folha amarela e mole: água demais",
            "Folha amarelada: rega em excesso",
            "Amarelecimento de baixo para cima: solo encharcado",
          ],
          l.slug + "e1"
        ),
        variar(
          [
            "Ponta seca e folha sem brilho: ar seco demais",
            "Folha esticada e pálida: falta de luz",
            "Mancha marrom na ponta: acúmulo de sal ou ar seco",
          ],
          l.slug + "e2"
        ),
      ],
    },
    curiosidades: [l.desc],
    origem: "seed",
  };
}

const completas = [
  ...plantas8.map((p) => ({ ...p, foto: p.svg, origem: "seed", svg: undefined })),
  ...plantas200.map(liteParaFicha),
];

const limpo = completas.map((p) => {
  const { svg: _svg, ...resto } = p;
  return resto;
});

// Preserva plantas cadastradas pelo painel (não sobrescreve trabalho do usuário).
if (ATUAL?.plantas) {
  const slugs = new Set(limpo.map((p) => p.slug));
  const extras = ATUAL.plantas.filter((p) => p.origem !== "seed" && !slugs.has(p.slug));
  if (extras.length) {
    limpo.unshift(...extras);
    console.log(`preservadas ${extras.length} planta(s) do painel`);
  }
}

mkdirSync(dirname(DESTINO), { recursive: true });
writeFileSync(DESTINO, JSON.stringify({ versao: 1, plantas: limpo }, null, 1), "utf8");

// Confere a variedade gerada.
const blocos = new Map();
for (const p of limpo) {
  const chave = p.cuidados.map((c) => c.texto).join("|");
  blocos.set(chave, (blocos.get(chave) ?? 0) + 1);
}
const grupos = [...blocos.values()];
console.log("plantas no seed:", limpo.length);
console.log("blocos de cuidado distintos:", blocos.size);
console.log("maior repetição de um mesmo bloco:", Math.max(...grupos));
console.log("arquivo:", DESTINO);
