/**
 * Prepara os arquivos da marca para a pasta video/logo/:
 *  - copia os SVG originais (fonte)
 *  - renderiza PNG em alta, que é o que o Flow aceita
 *    (versão com fundo verde e versão com fundo transparente)
 *
 * Uso: node scripts/preparar-logo.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOGO = join(RAIZ, "..", "..", "logo");
const SAIDA = join(RAIZ, "..", "video", "logo");
mkdirSync(SAIDA, { recursive: true });

const VERDE = "#1b4332";

const arquivos = [
  { origem: "mudai-icone.svg", nome: "icone", largura: 808, altura: 777 },
  { origem: "mudai-logo.svg", nome: "logo-completa", largura: 1466, altura: 506 },
];

// Copia os originais (fonte da verdade, dá para reeditar depois).
for (const a of arquivos) {
  copyFileSync(join(LOGO, a.origem), join(SAIDA, a.origem));
}

const nav = await chromium.launch();

for (const a of arquivos) {
  const svg = readFileSync(join(LOGO, a.origem), "utf8")
    .replace(/<\?xml.*?\?>/g, "")
    .replace(/fill="#FFFDF8"/gi, 'fill="#FFFFFF"');

  // Lado quadrado generoso, com folga em volta, para a marca não encostar na borda.
  const lado = 1024;
  const escala = Math.min((lado * 0.78) / a.largura, (lado * 0.78) / a.altura);
  const larguraFinal = Math.round(a.largura * escala);

  function pagina(fundo, transparente) {
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;width:${lado}px;height:${lado}px;overflow:hidden;
        background:${transparente ? "transparent" : fundo}}
      .wrap{width:${lado}px;height:${lado}px;display:flex;align-items:center;
        justify-content:center}
      .logo{width:${larguraFinal}px;height:auto;display:block}
      .logo svg{width:100%;height:auto;display:block}
    </style></head><body><div class="wrap"><div class="logo">${svg}</div></div></body></html>`;
  }

  for (const variante of [
    { sufixo: "fundo-verde", transparente: false },
    { sufixo: "fundo-transparente", transparente: true },
  ]) {
    const pag = await nav.newPage({ viewport: { width: lado, height: lado } });
    const tmp = join(RAIZ, "scripts", `.logo-tmp-${a.nome}-${variante.sufixo}.html`);
    writeFileSync(tmp, pagina(VERDE, variante.transparente));
    await pag.goto("file://" + tmp.replace(/\\/g, "/"));
    await pag.waitForTimeout(200);
    await pag.screenshot({
      path: join(SAIDA, `${a.nome}-${variante.sufixo}.png`),
      omitBackground: variante.transparente,
    });
    await pag.close();
    unlinkSync(tmp);
  }
}

await nav.close();
console.log("logo pronta em", SAIDA);
