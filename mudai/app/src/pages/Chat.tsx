import { useMemo, useRef, useState } from "react";
import { useCatalogo } from "../lib/catalogo";
import { useConta } from "../lib/conta";
import { carregarPets } from "../lib/pets";
import { ErroAPI, chatServidor, servidorConfigurado } from "../lib/api";
import { Tabbar, Topbar } from "../components/ui";

interface Msg {
  role: "user" | "bot";
  texto: string;
}

const FORA = [
  "sou jardineiro, disso aí eu não manjo. Das suas verdinhas eu manjo: pergunta de planta ou de luz que eu respondo.",
];

export function Chat() {
  const { plantas, buscar } = useCatalogo();
  const { verificado, uso, pedirConta, anotarUso } = useConta();
  const pets = useMemo(() => carregarPets(buscar), [buscar]);
  const liberado = !servidorConfigurado() || verificado;

  const abertura = useMemo(() => {
    if (pets.length === 0) {
      return "Oi, sou o Hachimi. Cuido de planta aqui. Me conta o que tá acontecendo com a sua, ou pergunta de luz, rega, vaso. Se quiser, cadastra ela em Meus pets que eu passo a acompanhar.";
    }
    const nomes = pets.map((p) => p.apelido).join(", ");
    return `Oi, sou o Hachimi. Já vi aqui suas plantas: ${nomes}. Pode perguntar de rega, luz, vaso, ou me dizer o que tá pegando.`;
  }, [pets]);

  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", texto: abertura }]);
  const [texto, setTexto] = useState("");
  const [digitando, setDigitando] = useState(false);
  const [bloqueio, setBloqueio] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  const enviar = async (pergunta?: string) => {
    const q = (pergunta ?? texto).trim();
    if (!q || digitando) return;
    if (!liberado) {
      pedirConta("chat");
      return;
    }
    const historico = msgs.map((m) => ({
      role: m.role === "bot" ? ("assistant" as const) : ("user" as const),
      texto: m.texto,
    }));
    setMsgs((m) => [...m, { role: "user", texto: q }]);
    setTexto("");
    setDigitando(true);
    setBloqueio(null);

    if (servidorConfigurado()) {
      try {
        const r = await chatServidor(
          q,
          pets.map((p) => ({ apelido: p.apelido, especie: p.planta.nomePopular, local: p.local })),
          historico
        );
        anotarUso(r.uso);
        setMsgs((m) => [...m, { role: "bot", texto: r.resposta }]);
        setDigitando(false);
        return;
      } catch (e) {
        if (e instanceof ErroAPI && (e.code === "LIMITE_CHAT" || e.code === "PRECISA_CONTA" || e.code === "CONTA_NAO_VERIFICADA")) {
          setMsgs((m) => [...m, { role: "bot", texto: e.message }]);
          setBloqueio(e.code);
          setDigitando(false);
          return;
        }
        // servidor fora do ar: responde com o que sabe localmente
      }
    }

    window.setTimeout(() => {
      setMsgs((m) => [...m, { role: "bot", texto: responder(q) }]);
      setDigitando(false);
    }, 700);
  };

  const responder = (q: string): string => {
    const t = q.toLowerCase();
    const planta = plantas.find(
      (p) => t.includes(p.nomePopular.toLowerCase()) || t.includes(p.nomeCientifico.toLowerCase())
    );
    const pet = pets.find((p) => t.includes(p.apelido.toLowerCase()));
    const alvo = pet?.planta ?? planta;

    const sobreOutraCoisa = /(receita|futebol|política|politica|filme|música|musica|dinheiro|bitcoin|concurso|prova|namoro|sexo|remédio|remedio|doença|doenca|covid|eleição|eleicao|carro|celular|iphone|android|programa|python|javascript)/.test(t);
    if (sobreOutraCoisa && !alvo) return FORA[0];

    if (/rega|regar|água|agua|molhar/.test(t) && alvo) {
      return `${alvo.nomePopular} gosta de água a cada ${alvo.aguaFreqDias[0]}–${alvo.aguaFreqDias[1]} dias. Enfia o dedo 2 cm na terra: seco, pode regar até escorrer; úmido, espera.${pet ? ` A ${pet.apelido} foi regada há ${pet.ultimaRegaDias} dias.` : ""}`;
    }
    if (/sol|luz|lux|janela|sombra|escuro/.test(t) && alvo) {
      return `${alvo.nomePopular} rende bem entre ${alvo.luxMin.toLocaleString("pt-BR")} e ${alvo.luxMax.toLocaleString("pt-BR")} lux (${alvo.tagLuz.toLowerCase()}). Passa o medidor no lugar onde ela fica e compara. Deu abaixo, aproxima da janela. Estourou, afasta do sol direto.`;
    }
    if (/vaso|replant|trocar|substrato|terra|adubo|npk/.test(t) && alvo) {
      return `Para ${alvo.nomePopular.toLowerCase()}: vaso dois dedos maior, com furo embaixo, substrato aerado e adubo leve na primavera. Depois da troca, rega bem e deixa três dias sem sol direto.`;
    }
    if (/amarela|marrom|murch|caindo|doente|mancha|praga/.test(t) && alvo) {
      return `Pelo que você descreve na ${alvo.nomePopular.toLowerCase()}: ${alvo.sinais.estresse[0].toLowerCase()}. Confere rega e luz primeiro, que é o que resolve quase sempre. Se piorar, tira uma foto no Identificar que eu olho melhor.`;
    }
    if (alvo) {
      return `${alvo.nomePopular} (${alvo.nomeCientifico}): ${alvo.descricao} Água a cada ${alvo.aguaFreqDias[0]}–${alvo.aguaFreqDias[1]} dias, ${alvo.tagLuz.toLowerCase()}, ${alvo.tempMin}–${alvo.tempMax}°. Quer que eu detalhe rega, luz ou vaso?`;
    }
    if (pet) {
      return `A ${pet.apelido} é uma ${pet.planta.nomePopular.toLowerCase()} que fica na ${pet.local.toLowerCase()}. Me pergunta de rega, luz ou algum sintoma que eu te digo o passo a passo.`;
    }
    return "Me fala qual planta é, ou manda uma foto no Identificar. Com isso eu te dou o caminho certo.";
  };

  const restantes = uso ? uso.limites.chatDia - uso.chatHoje : null;

  return (
    <div className="phone">
      <div className="screen">
        <Topbar titulo="Hachimi" subtitulo="o jardineiro · só manja de planta" />
        <div className="pad" style={{ paddingTop: 10 }}>
          <div className="row" style={{ background: "linear-gradient(120deg,var(--green-900),var(--green-700))", borderRadius: "var(--r-md)", padding: 16, color: "#fff" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--mustard)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, fontWeight: 800, color: "var(--green-950)" }}>H</div>
            <div>
              <b style={{ fontSize: 15 }}>Hachimi, o jardineiro</b>
              <p style={{ color: "rgba(255,255,255,.8)", fontSize: 12.5 }}>
                {pets.length > 0 ? `De olho em ${pets.map((p) => p.apelido).join(", ")}.` : "Ainda sem planta cadastrada."}
                {restantes != null ? ` ${restantes} conversas hoje.` : ""}
              </p>
            </div>
          </div>

          {!liberado && (
            <div className="card" style={{ padding: 16, marginTop: 14, background: "linear-gradient(135deg,#edf7ef,#fffdf8)" }}>
              <b style={{ fontSize: 15 }}>Crie sua conta para conversar comigo</b>
              <p style={{ marginTop: 6 }}>
                Leva um minuto: você recebe um código no e-mail e pronto. Cada conta tem {uso?.limites.chatDia ?? 10} conversas por dia.
              </p>
              <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => pedirConta("chat")}>
                Criar conta
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.role === "bot" ? "bot" : "user"}`}>{m.texto}</div>
            ))}
            {digitando && <div className="bubble bot">Hachimi está pensando…</div>}
            <div ref={fim} />
          </div>

          {bloqueio === "LIMITE_CHAT" && (
            <div className="card" style={{ padding: 14, marginTop: 12 }}>
              <b style={{ fontSize: 13.5 }}>Acabaram as conversas de hoje</b>
              <p className="small">Volta amanhã que eu tô aqui. Enquanto isso dá pra usar o medidor de luz e o mapa do sol.</p>
            </div>
          )}

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
          placeholder={liberado ? "Pergunte ao Hachimi…" : "Crie sua conta para conversar"}
          aria-label="Pergunte ao Hachimi"
          disabled={!liberado}
          style={{ flex: 1, fontFamily: "var(--font)", fontSize: 14, border: "1.5px solid var(--line)", borderRadius: 999, padding: "13px 18px", outline: "none", opacity: liberado ? 1 : 0.6 }}
        />
        <button
          onClick={() => enviar()}
          aria-label="Enviar"
          disabled={!liberado || digitando}
          style={{ width: 50, height: 50, borderRadius: "50%", border: "none", cursor: "pointer", background: "var(--green-900)", color: "#fff", fontSize: 20, opacity: liberado ? 1 : 0.6 }}
        >
          ↑
        </button>
      </div>
      <Tabbar />
    </div>
  );
}
