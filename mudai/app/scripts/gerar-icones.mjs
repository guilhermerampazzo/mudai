/**
 * Gera os ícones do launcher + as telas de abertura do Android
 * a partir de logo/mudai-icone.svg (fundo verde da marca + marca branca).
 * Uso: node scripts/gerar-icones.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SVG = readFileSync(join(RAIZ, "..", "..", "logo", "mudai-icone.svg"), "utf8")
  .replace(/<\?xml.*?\?>/g, "")
  .replace(/fill="#FFFDF8"/gi, 'fill="#FFFFFF"');

const VERDE = "#1b4332";

const DENSIDADES = [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
];

const SPLASHES = [
  ["drawable", 480, 320],
  ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280],
  ["drawable-port-mdpi", 320, 480],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
];

function paginaIcone(tamanho, escalaLogo, raio) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${tamanho}px;height:${tamanho}px;overflow:hidden;background:${VERDE}}
    .wrap{width:${tamanho}px;height:${tamanho}px;display:flex;align-items:center;justify-content:center;
      background:${VERDE};border-radius:${raio}px}
    .logo{width:${Math.round(tamanho * escalaLogo)}px;height:auto;display:block}
    .logo svg{width:100%;height:auto;display:block}
  </style></head><body><div class="wrap"><div class="logo">${SVG}</div></div></body></html>`;
}

function paginaSplash(largura, altura) {
  const lado = Math.min(largura, altura);
  const larguraLogo = Math.round(lado * 0.46);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${largura}px;height:${altura}px;overflow:hidden;background:${VERDE}}
    .wrap{width:${largura}px;height:${altura}px;display:flex;align-items:center;justify-content:center;background:${VERDE}}
    .logo{width:${larguraLogo}px;height:auto;display:block}
    .logo svg{width:100%;height:auto;display:block}
  </style></head><body><div class="wrap"><div class="logo">${SVG}</div></div></body></html>`;
}

const navegador = await chromium.launch();
const pag = await navegador.newPage();
const tmp = join(RAIZ, "scripts", ".icone-tmp.html");

async function render(destino, largura, altura, html) {
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(tmp, html);
  await pag.setViewportSize({ width: largura, height: altura });
  await pag.goto("file://" + tmp.replace(/\\/g, "/"));
  await pag.waitForTimeout(120);
  await pag.screenshot({ path: destino, omitBackground: false });
  return destino;
}

const res = join(RAIZ, "android", "app", "src", "main", "res");
const gerados = [];

for (const [dens, fator] of DENSIDADES) {
  const dir = join(res, `mipmap-${dens}`);
  const cheio = Math.round(48 * fator);
  const adaptativo = Math.round(108 * fator);
  gerados.push(await render(join(dir, "ic_launcher.png"), cheio, cheio, paginaIcone(cheio, 0.66, 0)));
  gerados.push(await render(join(dir, "ic_launcher_round.png"), cheio, cheio, paginaIcone(cheio, 0.6, cheio / 2)));
  gerados.push(await render(join(dir, "ic_launcher_foreground.png"), adaptativo, adaptativo, paginaIcone(adaptativo, 0.62, 0)));
}

for (const [dir, largura, altura] of SPLASHES) {
  gerados.push(await render(join(res, dir, "splash.png"), largura, altura, paginaSplash(largura, altura)));
}

gerados.push(await render(join(RAIZ, "public", "icone-app.png"), 512, 512, paginaIcone(512, 0.66, 0)));
gerados.push(await render(join(RAIZ, "public", "icone-app-redondo.png"), 512, 512, paginaIcone(512, 0.6, 256)));

await navegador.close();
console.log("gerados:", gerados.length);
