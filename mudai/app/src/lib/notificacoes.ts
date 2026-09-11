import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { idNotificacao, intervaloRega, type Pet } from "./pets";

const CANAL = "rega";
const CHAVE_IDS = "mudai:notif-agendadas";
const POR_PLANTA = 8;

const FRASES = [
  (nome: string) => `${nome} tá pedindo água. Já faz uns dias que você não rega.`,
  (nome: string) => `Hora de regar a ${nome}. Confere a terra antes, mas provavelmente tá na hora.`,
  (nome: string) => `A ${nome} tá com sede. Um dedo na terra e você confirma.`,
  (nome: string) => `Lembrete: regar a ${nome} hoje.`,
];

function idsAgendados(): number[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_IDS) ?? "[]") as number[];
  } catch {
    return [];
  }
}

function guardarIds(ids: number[]): void {
  try {
    localStorage.setItem(CHAVE_IDS, JSON.stringify(ids));
  } catch {
    /* ignora */
  }
}

export function notificacoesDisponiveis(): boolean {
  return Capacitor.isNativePlatform();
}

export async function permissaoConcedida(): Promise<boolean> {
  if (!notificacoesDisponiveis()) return false;
  try {
    const r = await LocalNotifications.checkPermissions();
    return r.display === "granted";
  } catch {
    return false;
  }
}

export async function pedirPermissao(): Promise<boolean> {
  if (!notificacoesDisponiveis()) return false;
  try {
    const r = await LocalNotifications.requestPermissions();
    return r.display === "granted";
  } catch {
    return false;
  }
}

async function garantirCanal(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: CANAL,
      name: "Lembrete de rega",
      description: "Avisa quando a sua planta precisa de água",
      importance: 4,
      visibility: 1,
    });
  } catch {
    /* canal já existe */
  }
}

export async function cancelarRegas(): Promise<void> {
  if (!notificacoesDisponiveis()) return;
  const ids = idsAgendados();
  if (ids.length === 0) return;
  try {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch {
    /* nada agendado */
  }
  guardarIds([]);
}

/**
 * Agenda os próximos lembretes de rega de cada planta.
 * O intervalo vem do próprio catálogo: planta de 1 em 1 dia recebe aviso diário.
 */
export async function agendarRegas(pets: Pet[]): Promise<number> {
  if (!notificacoesDisponiveis()) return 0;
  if (!(await permissaoConcedida())) return 0;

  await garantirCanal();
  await cancelarRegas();

  const agora = Date.now();
  const avisos: { id: number; title: string; body: string; schedule: { at: Date }; channelId: string }[] = [];
  const ids: number[] = [];

  for (const pet of pets) {
    if (pet.notificar === false) continue;
    const intervalo = intervaloRega(pet);
    const base = idNotificacao(pet.id);
    const diasJaPassados = pet.ultimaRegaDias;

    for (let i = 0; i < POR_PLANTA; i++) {
      const dias = intervalo * (i + 1) - diasJaPassados;
      const quando = new Date(agora + Math.max(dias, 0) * 86400000 + 9 * 3600000);
      if (quando.getTime() <= agora) continue;

      const id = base + i;
      const frase = FRASES[(base + i) % FRASES.length];
      avisos.push({
        id,
        title: `Hora de regar a ${pet.apelido}`,
        body: frase(pet.apelido),
        schedule: { at: quando },
        channelId: CANAL,
      });
      ids.push(id);
    }
  }

  if (avisos.length === 0) return 0;

  try {
    await LocalNotifications.schedule({ notifications: avisos });
    guardarIds(ids);
    return avisos.length;
  } catch {
    return 0;
  }
}

/** Quantos avisos estão agendados (para mostrar na tela). */
export function quantosAgendados(): number {
  return idsAgendados().length;
}
