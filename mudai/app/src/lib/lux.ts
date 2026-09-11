export interface AmostraLux {
  t: number;
  lux: number;
}

export function simularLux(base = 2200, variacao = 900): number {
  return Math.max(50, Math.round(base + (Math.random() - 0.5) * 2 * variacao));
}

export function estatisticas(amostras: AmostraLux[]): {
  atual: number;
  pico: number;
  max: number;
  min: number;
  media: number;
} {
  if (amostras.length === 0) return { atual: 0, pico: 0, max: 0, min: 0, media: 0 };
  const valores = amostras.map((a) => a.lux);
  return {
    atual: valores[valores.length - 1],
    pico: Math.max(...valores),
    max: Math.max(...valores),
    min: Math.min(...valores),
    media: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
  };
}

export function faixaLux(lux: number): { rotulo: string; classe: string } {
  if (lux < 500) return { rotulo: "Sombra — pouca luz", classe: "" };
  if (lux < 2000) return { rotulo: "Meia-sombra fraca", classe: "" };
  if (lux < 10000) return { rotulo: "Ótimo para meia-sombra", classe: "sun" };
  if (lux < 25000) return { rotulo: "Luz forte — bom para sol", classe: "sun" };
  return { rotulo: "Sol pleno intenso", classe: "sun" };
}
