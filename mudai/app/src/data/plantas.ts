export interface Cuidado {
  titulo: string;
  texto: string;
}

export interface FichaPlanta {
  slug: string;
  nomePopular: string;
  nomeCientifico: string;
  descricao: string;
  svg: string;
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
  cuidados: Cuidado[];
  sinais: { feliz: string[]; estresse: string[] };
  curiosidades: string[];
}

export const PLANTAS: FichaPlanta[] = [
  {
    slug: "jiboia",
    nomePopular: "Jiboia",
    nomeCientifico: "Epipremnum aureum",
    descricao:
      "A queridinha de quem está começando. Aguenta esquecimento, pouca luz e ainda purifica o ar. Pendente linda para prateleira.",
    svg: "epipremnum-aureum.jpg",
    aguaNivel: 3,
    aguaFreqDias: [5, 7],
    luxMin: 1000,
    luxMax: 5000,
    tempMin: 18,
    tempMax: 30,
    umidadeMin: 40,
    umidadeMax: 70,
    dificuldade: 1,
    porte: "Até 3 m",
    toxicaPets: true,
    tags: ["meia-sombra", "agua-moderada", "iniciante", "interna", "purifica-ar", "pendente"],
    tagLuz: "Meia-sombra",
    cuidados: [
      { titulo: "Rega", texto: "Dedo no solo: seco 2 cm? Pode regar até escorrer." },
      { titulo: "Adubo", texto: "NPK 10-10-10 a cada 30 dias na primavera." },
      { titulo: "Poda", texto: "Corte abaixo do nó para replantar a muda." },
    ],
    sinais: {
      feliz: ["Folhas firmes e brilhantes", "Brotos novos frequentes"],
      estresse: ["Ponta marrom: ar seco ou sede", "Folha amarela: excesso de água"],
    },
    curiosidades: ["Sobrevive até em banheiro com pouca luz.", "Cada pedaço de caule com nó vira uma muda nova."],
  },
  {
    slug: "zamioculca",
    nomePopular: "Zamioculca",
    nomeCientifico: "Zamioculcas zamiifolia",
    descricao:
      "Quase indestrutível. Guarda água no rizoma e perdoa semanas sem rega. Ideal para quarto e escritório.",
    svg: "zamioculcas-zamiifolia.jpg",
    aguaNivel: 1,
    aguaFreqDias: [12, 20],
    luxMin: 500,
    luxMax: 4000,
    tempMin: 18,
    tempMax: 30,
    umidadeMin: 30,
    umidadeMax: 60,
    dificuldade: 1,
    porte: "Até 90 cm",
    toxicaPets: true,
    tags: ["meia-sombra", "pouca-agua", "iniciante", "interna", "quarto"],
    tagLuz: "Meia-sombra",
    cuidados: [
      { titulo: "Rega", texto: "Solo bem seco entre regas. Na dúvida, espere mais 3 dias." },
      { titulo: "Adubo", texto: "Metade da dose de NPK a cada 60 dias." },
      { titulo: "Limpeza", texto: "Pano úmido nas folhas uma vez ao mês." },
    ],
    sinais: {
      feliz: ["Folhas rígidas e verde-escuras", "Brotos grossos na base"],
      estresse: ["Caule mole: apodrecimento por excesso de água", "Amarelamento geral: solo encharcado"],
    },
    curiosidades: ["Rizomas armazenam água por semanas.", "Cresce devagar: paciência é o adubo."],
  },
  {
    slug: "espada-de-sao-jorge",
    nomePopular: "Espada-de-são-jorge",
    nomeCientifico: "Sansevieria trifasciata",
    descricao:
      "A guardiã da casa. Tolera sombra, sol, esquecimento e ainda libera oxigênio à noite.",
    svg: "dracaena-trifasciata.jpg",
    aguaNivel: 1,
    aguaFreqDias: [14, 21],
    luxMin: 500,
    luxMax: 10000,
    tempMin: 15,
    tempMax: 32,
    umidadeMin: 25,
    umidadeMax: 60,
    dificuldade: 1,
    porte: "Até 1,2 m",
    toxicaPets: true,
    tags: ["sombra", "meia-sombra", "pouca-agua", "iniciante", "interna", "quarto", "purifica-ar"],
    tagLuz: "Sombra a sol",
    cuidados: [
      { titulo: "Rega", texto: "Quase nada: solo seco por completo entre regas." },
      { titulo: "Vaso", texto: "Prefere vaso apertado. Troque só quando rachar." },
      { titulo: "Sol", texto: "Aceita de canto escuro a janela com sol." },
    ],
    sinais: {
      feliz: ["Folhas eretas e firmes", "Filhos brotando na lateral"],
      estresse: ["Base mole: água demais", "Folha tombada: apodrecimento do rizoma"],
    },
    curiosidades: ["Faz fotossíntese CAM: ótima para o quarto.", "Diz a lenda que espanta mau-olhado."],
  },
  {
    slug: "samambaia",
    nomePopular: "Samambaia",
    nomeCientifico: "Nephrolepis exaltata",
    descricao:
      "Clássica das varandas brasileiras. Ama umidade e sombra fresca, odeia ar-condicionado direto.",
    svg: "nephrolepis-exaltata.jpg",
    aguaNivel: 4,
    aguaFreqDias: [2, 3],
    luxMin: 1000,
    luxMax: 3000,
    tempMin: 18,
    tempMax: 28,
    umidadeMin: 60,
    umidadeMax: 90,
    dificuldade: 2,
    porte: "Até 80 cm",
    toxicaPets: false,
    tags: ["sombra", "meia-sombra", "muita-agua", "borrifo-foliar", "intermediario", "varanda", "banheiro-umido", "pendente", "segura-pets"],
    tagLuz: "Sombra fresca",
    cuidados: [
      { titulo: "Rega", texto: "Solo sempre úmido, nunca encharcado. Borrife 3x na semana." },
      { titulo: "Local", texto: "Varanda sombreada ou banheiro com luz. Longe do vento." },
      { titulo: "Adubo", texto: "Orgânico leve mensal na primavera e verão." },
    ],
    sinais: {
      feliz: ["Frondes verdes e arqueadas", "Brotos enroladinhos no centro"],
      estresse: ["Folha seca e quebradiça: ar seco", "Amarelamento: sol direto demais"],
    },
    curiosidades: ["Não dá flor: se reproduz por esporos.", "Ama banheiro úmido com janela."],
  },
  {
    slug: "echeveria",
    nomePopular: "Echeveria",
    nomeCientifico: "Echeveria elegans",
    descricao:
      "Roseta gordinha que ama sol. Quanto mais luz, mais compacta e colorida ela fica.",
    svg: "echeveria-elegans.jpg",
    aguaNivel: 1,
    aguaFreqDias: [10, 15],
    luxMin: 10000,
    luxMax: 40000,
    tempMin: 15,
    tempMax: 30,
    umidadeMin: 20,
    umidadeMax: 50,
    dificuldade: 1,
    porte: "Até 15 cm",
    toxicaPets: false,
    tags: ["sol-pleno", "pouca-agua", "iniciante", "varanda", "segura-pets", "suculenta"],
    tagLuz: "Sol pleno",
    cuidados: [
      { titulo: "Rega", texto: "Molhe só o solo, nunca a roseta. Espere secar tudo." },
      { titulo: "Sol", texto: "Mínimo 4h de sol direto. Sem sol, ela estica e deforma." },
      { titulo: "Vaso", texto: "Substrato bem drenado + furo embaixo, sempre." },
    ],
    sinais: {
      feliz: ["Roseta compacta e simétrica", "Pontas rosadas no sol"],
      estresse: ["Estiolada (esticada): falta de luz", "Folha mole e translúcida: água demais"],
    },
    curiosidades: ["Cada folhinha solta vira uma muda nova.", "O pozinho branco protege do sol: não limpe."],
  },
  {
    slug: "orquidea",
    nomePopular: "Orquídea",
    nomeCientifico: "Phalaenopsis amabilis",
    descricao:
      "Elegante e mais fácil do que parece. O segredo é esquecer a rega e acertar a luz.",
    svg: "phalaenopsis-amabilis.jpg",
    aguaNivel: 2,
    aguaFreqDias: [7, 10],
    luxMin: 8000,
    luxMax: 15000,
    tempMin: 18,
    tempMax: 28,
    umidadeMin: 50,
    umidadeMax: 70,
    dificuldade: 2,
    porte: "Até 60 cm",
    toxicaPets: false,
    tags: ["luz-indireta-brilhante", "agua-moderada", "intermediario", "interna", "florifera", "segura-pets"],
    tagLuz: "Luz indireta",
    cuidados: [
      { titulo: "Rega", texto: "Raiz prateada = hora de regar. Verde = espera." },
      { titulo: "Após florir", texto: "Corte a haste acima do 2º nó para reflorescer." },
      { titulo: "Substrato", texto: "Casca de pinus + carvão, nunca terra comum." },
    ],
    sinais: {
      feliz: ["Raízes verdes e firmes", "Folha nova no centro"],
      estresse: ["Botão caindo: mudança brusca de lugar", "Raiz marrom e mole: apodrecimento"],
    },
    curiosidades: ["A flor dura até 3 meses aberta.", "Gelo na rega é mito: use água morna."],
  },
  {
    slug: "costela-de-adao",
    nomePopular: "Costela-de-adão",
    nomeCientifico: "Monstera deliciosa",
    descricao:
      "A estrela do Instagram. Folha recortada, presença de selva e cuidado moderado.",
    svg: "monstera-deliciosa.jpg",
    aguaNivel: 3,
    aguaFreqDias: [5, 8],
    luxMin: 2000,
    luxMax: 8000,
    tempMin: 18,
    tempMax: 30,
    umidadeMin: 50,
    umidadeMax: 80,
    dificuldade: 2,
    porte: "Até 3 m",
    toxicaPets: true,
    tags: ["meia-sombra", "luz-indireta-brilhante", "agua-moderada", "intermediario", "interna", "crescimento-rapido"],
    tagLuz: "Meia-sombra",
    cuidados: [
      { titulo: "Rega", texto: "Topo do solo seco = rega. Amarra num tutor de musgo." },
      { titulo: "Folhas", texto: "Limpe o pó mensal para os rasgos abrirem bem." },
      { titulo: "Adubo", texto: "NPK mensal na estação quente." },
    ],
    sinais: {
      feliz: ["Folhas novas com rasgos", "Raízes aéreas saudáveis"],
      estresse: ["Sem rasgos: pouca luz ou planta jovem", "Mancha preta: fungo por excesso de água"],
    },
    curiosidades: ["Os rasgos deixam o vento passar na selva.", "O fruto é comestível quando maduro."],
  },
  {
    slug: "cacto",
    nomePopular: "Cacto",
    nomeCientifico: "Cactaceae",
    descricao:
      "Sol, pouca água e zero drama. Perfeito para janelas ensolaradas e donos esquecidos.",
    svg: "cacto-generico.jpg",
    aguaNivel: 1,
    aguaFreqDias: [15, 25],
    luxMin: 15000,
    luxMax: 50000,
    tempMin: 12,
    tempMax: 35,
    umidadeMin: 15,
    umidadeMax: 40,
    dificuldade: 1,
    porte: "Varia",
    toxicaPets: false,
    tags: ["sol-pleno", "pouca-agua", "iniciante", "varanda", "externa", "suculenta"],
    tagLuz: "Sol pleno",
    cuidados: [
      { titulo: "Rega", texto: "No verão a cada 15 dias, no inverno quase nada." },
      { titulo: "Sol", texto: "Quanto mais sol direto, melhor. Janela sul é ouro." },
      { titulo: "Vaso", texto: "Areia grossa no substrato para drenar rápido." },
    ],
    sinais: {
      feliz: ["Corpo firme e cor viva", "Espinhos novos no topo"],
      estresse: ["Base amolecida: apodrecimento", "Branqueamento: queimadura de mudança brusca"],
    },
    curiosidades: ["Alguns vivem mais de 100 anos.", "Espinhos são folhas modificadas."],
  },
];

export const TAG_FILTROS = [
  "Todas",
  "Sol pleno",
  "Meia-sombra",
  "Pouca água",
  "Pet-safe",
  "Iniciante",
] as const;

export function filtrarPlantas(filtro: string): FichaPlanta[] {
  if (filtro === "Todas") return PLANTAS;
  const mapa: Record<string, string> = {
    "Sol pleno": "sol-pleno",
    "Meia-sombra": "meia-sombra",
    "Pouca água": "pouca-agua",
    "Pet-safe": "segura-pets",
    Iniciante: "iniciante",
  };
  const tag = mapa[filtro];
  return PLANTAS.filter((p) => p.tags.includes(tag));
}

export function buscarPlanta(slug: string): FichaPlanta | undefined {
  return PLANTAS.find((p) => p.slug === slug);
}
