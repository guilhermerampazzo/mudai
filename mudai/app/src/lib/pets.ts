import type { FichaPlanta } from "../data/plantasIndex";

export interface Pet {
  id: string;
  apelido: string;
  slug: string;
  planta: FichaPlanta;
  local: string;
  ultimaRegaDias: number;
  ultimoLux: number | null;
  tempAmbiente: number;
}

const KEY = "mudai:pets:v1";

const SEED: Pet[] = [
  {
    id: "pet-juju",
    apelido: "Juju",
    slug: "jiboia",
    planta: undefined as unknown as FichaPlanta,
    local: "Sala",
    ultimaRegaDias: 2,
    ultimoLux: 2400,
    tempAmbiente: 24,
  },
  {
    id: "pet-gordinha",
    apelido: "Gordinha",
    slug: "echeveria",
    planta: undefined as unknown as FichaPlanta,
    local: "Janela",
    ultimaRegaDias: 9,
    ultimoLux: 1800,
    tempAmbiente: 26,
  },
  {
    id: "pet-zaza",
    apelido: "Zazá",
    slug: "zamioculca",
    planta: undefined as unknown as FichaPlanta,
    local: "Quarto",
    ultimaRegaDias: 6,
    ultimoLux: 1500,
    tempAmbiente: 23,
  },
];

export function carregarPets(resolver: (slug: string) => FichaPlanta | undefined): Pet[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const pets = JSON.parse(raw) as Pet[];
      return pets
        .map((p) => ({ ...p, planta: resolver(p.slug)! }))
        .filter((p) => p.planta);
    }
  } catch {
    /* ignora e usa seed */
  }
  return SEED.map((p) => ({ ...p, planta: resolver(p.slug)! })).filter((p) => p.planta);
}

export function salvarPets(pets: Pet[]): void {
  const slim = pets.map(({ planta: _planta, ...rest }) => rest);
  localStorage.setItem(KEY, JSON.stringify(slim));
}

export function scoreLux(pet: Pet): number {
  if (pet.ultimoLux == null) return 50;
  const { luxMin, luxMax } = pet.planta;
  const lux = pet.ultimoLux;
  if (lux >= luxMin && lux <= luxMax) return 100;
  if (lux < luxMin) return Math.max(10, Math.round((lux / luxMin) * 100));
  return Math.max(10, Math.round(100 - ((lux - luxMax) / luxMax) * 120));
}

export function scoreRega(pet: Pet): number {
  const [, max] = pet.planta.aguaFreqDias;
  const d = pet.ultimaRegaDias;
  if (d <= max) return 100;
  const atraso = d - max;
  return Math.max(5, 100 - atraso * 18);
}

export function scoreTemp(pet: Pet): number {
  const { tempMin, tempMax } = pet.planta;
  const t = pet.tempAmbiente;
  if (t >= tempMin && t <= tempMax) return 100;
  const dist = t < tempMin ? tempMin - t : t - tempMax;
  return Math.max(10, 100 - dist * 12);
}

export function scoreSaude(pet: Pet): number {
  return Math.round(scoreLux(pet) * 0.5 + scoreRega(pet) * 0.35 + scoreTemp(pet) * 0.15);
}

export function estadoPet(score: number): { rotulo: string; detalhe: string } {
  if (score >= 85) return { rotulo: "Feliz", detalhe: "tudo certo por aqui" };
  if (score >= 65) return { rotulo: "Ok", detalhe: "quase lá, um ajuste" };
  if (score >= 45) return { rotulo: "Atenção", detalhe: "precisa de cuidado" };
  return { rotulo: "Murchinha", detalhe: "socorro, me ajuda" };
}

export function dicaPet(pet: Pet): string {
  const lux = scoreLux(pet);
  const rega = scoreRega(pet);
  const temp = scoreTemp(pet);
  if (rega < lux && rega < temp) {
    return `Rega atrasada há ${pet.ultimaRegaDias} dias. Muda aí e rega hoje.`;
  }
  if (lux < rega && lux < temp) {
    if ((pet.ultimoLux ?? 0) < pet.planta.luxMin)
      return "Luz fraca para ela. Aproxime da janela.";
    return "Luz forte demais. Afaste um pouco do sol direto.";
  }
  if (temp < 100) return "Temperatura fora do ideal. Evite ar-condicionado direto.";
  return "Tudo certo. Mantenha a rotina.";
}
