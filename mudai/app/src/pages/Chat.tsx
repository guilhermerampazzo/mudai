import { useMemo, useState } from "react";
import { buscarTodas, TODAS_PLANTAS } from "../data/plantasIndex";
import { carregarPets } from "../lib/pets";
import { chatServidor, servidorConfigurado } from "../lib/api";
import { Tabbar, Topbar } from "../components/ui";

interface Msg {
  role: "user" | "bot";
  texto: string;
}

const FORA = [
  "sou jardineiro, disso aí eu não manjo — mas das suas verdinhas eu manjo. Pergunta de planta ou luz que eu respondo.",
];

export function Chat() {
  const pets = useMemo(() => carregarPets(buscarTodas), []);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", texto: `Opa, cheguei. Sou o Hachimi, o jardineiro. Vi aqui seus pets: ${pets.map((p) => p.apelido).join(", ")}. Pode perguntar de rega, luz, sol, vaso — coisa de planta.` },
  ]);
  const [texto, setTexto] = useState("");
  const [digitando, setDigitando] = useState(false);

  const enviar = async (pergunta?: string) => {
    const q = (pergunta ?? texto).trim();
    if (!q) return;
    const historico = msgs.map((m) => ({ role: m.role === "bot" ? ("assistant" as const) : ("user" as const), texto: m.texto }));
    setMsgs((m) => [...m, { role: "user", texto: q }]);
    setTexto("");
    setDigitando(true);
    if (servidorConfigurado()) {
      try {
        const resposta = await chatServidor(
          q,
          pets.map((p) => ({ apelido: p.apelido, especie: p.planta.nomePopular, local: p.local })),
          historico
        );
        setMsgs((m) => [...m, { role: "bot", texto: resposta }]);
        setDigitando(false);
        return;
      } catch {
        /* cai no local */
      }
    }
    window.setTimeout(() => {
      setMsgs((m) => [...m, { role: "bot", texto: responder(q) }]);
      setDigitando(false);
    }, 900);
  };

  const responder = (q: string): string => {
    const t = q.toLowerCase();
    const planta = TODAS_PLANTAS.find(
      (p) => t.includes(p.nomePopular.toLowerCase()) || t.includes(p.nomeCientifico.toLowerCase())
    );
    const pet = pets.find((p) => t.includes(p.apelido.toLowerCase()));
    const alvo = pet?.planta ?? planta;

    const sobreOutraCoisa = /(receita|futebol|política|politica|filme|música|musica|dinheiro|bitcoin|concurso|prova|namoro|sexo|remédio|remedio|doença|doenca|covid|eleição|eleicao|carro|celular|iphone|android|programa|python|javascript)/.test(t);
    if (sobreOutraCoisa && !alvo) return FORA[0];

    if (/rega|regar|água|agua|molhar/.test(t) && alvo) {
      return `${alvo.nomePopular} gosta de água a cada ${alvo.aguaFreqDias[0]}–${alvo.aguaFreqDias[1]} dias. Teste do dedo: enfia 2 cm no solo — seco, pode regar até escorrer; úmido, espera. ${pet ? `A ${pet.apelido} foi regada há ${pet.ultimaRegaDias} dias.` : ""}`;
    }
    if (/sol|luz|lux|janela|sombra|escuro/.test(t) && alvo) {
      return `${alvo.nomePopular} rende bem entre ${alvo.luxMin.toLocaleString("pt-BR")} e ${alvo.luxMax.toLocaleString("pt-BR")} lux (${alvo.tagLuz.toLowerCase()}). Passa o medidor no local dela e compara — se der abaixo, aproxima da janela; se estourar, afasta do sol direto.`;
    }
    if (/vaso|replant|trocar|substrato|terra|adubo|npk/.test(t) && alvo) {
      return `Para ${alvo.nomePopular.toLowerCase()}: vaso 2 dedos maior com furo, substrato aerado e adubo leve na primavera. Depois da troca, rega bem e 3 dias sem sol direto.`;
    }
    if (/amarela|marrom|murch|caindo|doente|mancha|praga/.test(t) && alvo) {
      return `Pelo que você descreve na ${alvo.nomePopular.toLowerCase()}: ${alvo.sinais.estresse[0].toLowerCase()}. Confere a rega e a luz primeiro — 8 em cada 10 casos é um dos dois. Se piorar, tira uma foto no Identificar que eu olho melhor.`;
    }
    if (alvo) {
      return `${alvo.nomePopular} (${alvo.nomeCientifico}): ${alvo.descricao} Água a cada ${alvo.aguaFreqDias[0]}–${alvo.aguaFreqDias[1]} dias, luz ${alvo.tagLuz.toLowerCase()}, ${alvo.tempMin}–${alvo.tempMax}°. Quer que eu detalhe rega, luz ou vaso?`;
    }
    if (pet) {
      return `A ${pet.apelido} é uma ${pet.planta.nomePopular.toLowerCase()} que fica na ${pet.local.toLowerCase()}. Me pergunta de rega, luz ou algum sintoma que eu te digo o passo a passo.`;
    }
    return `Anotado. Sou jardineiro de planta e luz para planta — me fala qual verdinha (ou manda a foto no Identificar) que eu te dou o caminho exato.`;
  };

  return (
    <div className="phone">
      <div className="screen">
        <Topbar titulo="Hachimi" subtitulo="o jardineiro · só manja de planta" />
        <div className="pad" style={{ paddingTop: 10 }}>
          <div className="row" style={{ background: "linear-gradient(120deg,var(--green-900),var(--green-700))", borderRadius: "var(--r-md)", padding: 16, color: "#fff" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--mustard)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, fontWeight: 800, color: "var(--green-950)" }}>H</div>
            <div><b style={{ fontSize: 15 }}>Hachimi, o jardineiro</b>
              <p style={{ color: "rgba(255,255,255,.8)", fontSize: 12.5 }}>Lembrei dos seus pets: {pets.map((p) => p.apelido).join(", ")}. Pode perguntar.</p></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.role === "bot" ? "bot" : "user"}`}>{m.texto}</div>
            ))}
            {digitando && <div className="bubble bot">Hachimi está escrevendo…</div>}
          </div>
          <div className="row" style={{ marginTop: 12, overflowX: "auto" }}>
            {["Quando regar?", "Minha planta pega sol?", "Folha amarela, e agora?"].map((s) => (
              <span key={s} className="chip" onClick={() => enviar(s)}>{s}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "12px 16px" }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder="Pergunte ao Hachimi…"
          aria-label="Pergunte ao Hachimi"
          style={{ flex: 1, fontFamily: "var(--font)", fontSize: 14, border: "1.5px solid var(--line)", borderRadius: 999, padding: "13px 18px", outline: "none" }}
        />
        <button onClick={() => enviar()} aria-label="Enviar" style={{ width: 50, height: 50, borderRadius: "50%", border: "none", cursor: "pointer", background: "var(--green-900)", color: "#fff", fontSize: 20 }}>↑</button>
      </div>
      <Tabbar />
    </div>
  );
}
