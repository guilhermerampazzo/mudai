/**
 * Captura as telas reais do app em produção, para usar no vídeo.
 * Uso: node scripts/capturar-telas.mjs
 * Saída: ../video/telas/*.png
 */
import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(RAIZ, "..", "video", "telas");
mkdirSync(SAIDA, { recursive: true });

const BASE = "https://mudai.codermaster.com.br";
const SESSAO = process.env.MUDAI_SESSAO ?? "";

// Escala 3x: dá imagem nítida em 1170x2532, bom para vídeo.
const CONTEXTO = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  geolocation: { latitude: -23.5505, longitude: -46.6333 },
  permissions: ["geolocation"],
};

// Plantas do catálogo para a tela "Minhas plantas".
const PETS = [
  { id: "pet-juju", apelido: "Juju", slug: "jiboia", local: "Sala", ultimaRegaDias: 2, ultimoLux: 2400, tempAmbiente: 24 },
  { id: "pet-gordinha", apelido: "Gordinha", slug: "echeveria", local: "Janela", ultimaRegaDias: 9, ultimoLux: 1800, tempAmbiente: 26 },
  { id: "pet-zaza", apelido: "Zazá", slug: "zamioculca", local: "Quarto", ultimaRegaDias: 6, ultimoLux: 1500, tempAmbiente: 23 },
];

const capturadas = [];

async function nova() {
  const nav = await chromium.launch();
  const ctx = await nav.newContext(CONTEXTO);
  const pag = await ctx.newPage();
  if (SESSAO) {
    await pag.addInitScript((t) => window.localStorage.setItem("mudai:sessao", t), SESSAO);
  }
  return { nav, pag };
}

async function tirar(pag, nome, seletor) {
  await pag.waitForTimeout(400);
  const alvo = seletor ? await pag.$(seletor) : null;
  const destino = join(SAIDA, `${nome}.png`);
  if (alvo) {
    await alvo.screenshot({ path: destino });
  } else {
    await pag.screenshot({ path: destino });
  }
  capturadas.push(nome);
  console.log(`  ${nome}.png`);
}

/* ------------------------- telas sem conta ------------------------- */

{
  const { nav, pag } = await nova();
  console.log("Telas abertas:");

  await pag.goto(`${BASE}/#/bem-vindo`, { waitUntil: "networkidle" });
  await pag.waitForTimeout(2500);
  await tirar(pag, "00-boas-vindas");

  await pag.goto(`${BASE}/#/`, { waitUntil: "networkidle" });
  await pag.waitForTimeout(4000);
  await tirar(pag, "01-descobrir");

  await pag.goto(`${BASE}/#/planta/jiboia`, { waitUntil: "networkidle" });
  await pag.waitForTimeout(3500);
  await tirar(pag, "02-ficha-planta");

  await pag.goto(`${BASE}/#/medidor`, { waitUntil: "networkidle" });
  await pag.waitForTimeout(5000);
  await tirar(pag, "03-medidor-luz");

  await pag.goto(`${BASE}/#/sol`, { waitUntil: "networkidle" });
  await pag.waitForTimeout(4500);
  await tirar(pag, "06-posicao-sol");

  await nav.close();
}

/* ------------------------- telas com conta ------------------------- */

if (SESSAO) {
  const { nav, pag } = await nova();
  console.log("Telas com conta:");

  // Minhas plantas: injeta as plantas antes de abrir.
  await pag.addInitScript((pets) => {
    const leves = pets.map((p) => ({ ...p, planta: undefined }));
    window.localStorage.setItem("mudai:pets:v2", JSON.stringify(leves));
  }, PETS);
  await pag.goto(`${BASE}/#/pets`, { waitUntil: "networkidle" });
  await pag.waitForTimeout(4000);
  await tirar(pag, "07-minhas-plantas");
  await nav.close();

  // Chat: manda uma pergunta e espera a resposta de verdade.
  {
    const { nav, pag } = await nova();
    await pag.goto(`${BASE}/#/chat`, { waitUntil: "networkidle" });
    await pag.waitForTimeout(3000);
    const campo = await pag.$("input[aria-label='Pergunte ao Hachimi']");
    if (campo) {
      await campo.fill("minha jiboia ta com folha amarela, o que faco?");
      await pag.keyboard.press("Enter");
      console.log("  aguardando o Hachimi responder…");
      await pag.waitForTimeout(50000);
    }
    await tirar(pag, "05-chat-hachimi");
    await nav.close();
  }

  // Identificar: sobe uma foto e espera o resultado.
  {
    const { nav, pag } = await nova();
    await pag.goto(`${BASE}/#/identificar`, { waitUntil: "networkidle" });
    await pag.waitForTimeout(2500);
    const entrada = await pag.$("input[type='file']");
    if (entrada) {
      await entrada.setInputFiles(join(RAIZ, "public", "plantas", "monstera-deliciosa.jpg"));
      console.log("  aguardando a identificação…");
      await pag.waitForTimeout(60000);
    }
    await tirar(pag, "04-identificar");
    await nav.close();
  }
}

writeFileSync(join(SAIDA, "_capturadas.json"), JSON.stringify(capturadas, null, 1));
console.log(`\n${capturadas.length} telas salvas em ${SAIDA}`);
