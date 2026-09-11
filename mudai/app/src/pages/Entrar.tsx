import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErroAPI, criarConta, servidorConfigurado, verificarCodigo } from "../lib/api";
import { TEXTO_MOTIVO, useConta, type Motivo } from "../lib/conta";
import { IconBtn } from "../components/ui";
import { Icons } from "../components/icons";

type Etapa = "email" | "codigo" | "pronto";

export function Entrar() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { usuario, uso, logado, recarregar, sair } = useConta();
  const motivo = (params.get("motivo") as Motivo) ?? "geral";
  const texto = TEXTO_MOTIVO[motivo] ?? TEXTO_MOTIVO.geral;

  const [etapa, setEtapa] = useState<Etapa>("email");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (segundos <= 0) return;
    const t = window.setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [segundos]);

  if (!servidorConfigurado()) {
    return (
      <div className="phone"><div className="screen"><div className="pad">
        <h2>Sem conexão</h2>
        <p>Não consegui falar com o servidor do Mudaí.</p>
        <Link to="/">Voltar ao app</Link>
      </div></div></div>
    );
  }

  const enviarCodigo = async () => {
    setErro(null);
    setAviso(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErro("Confere o e-mail.");
      return;
    }
    setOcupado(true);
    try {
      const r = await criarConta(email.trim(), nome.trim());
      setEtapa("codigo");
      setSegundos(45);
      setAviso(r.mensagem || "Código enviado. Olha seu e-mail.");
    } catch (e) {
      setErro(e instanceof ErroAPI ? e.message : "Não consegui enviar agora. Tenta de novo.");
    } finally {
      setOcupado(false);
    }
  };

  const confirmar = async () => {
    setErro(null);
    if (codigo.trim().length < 4) {
      setErro("Digite o código que chegou no e-mail.");
      return;
    }
    setOcupado(true);
    try {
      await verificarCodigo(email.trim(), codigo.trim());
      setEtapa("pronto");
      recarregar();
    } catch (e) {
      setErro(e instanceof ErroAPI ? e.message : "Código inválido.");
    } finally {
      setOcupado(false);
    }
  };

  if (logado && etapa !== "pronto") {
    return (
      <div className="phone">
        <div className="screen">
          <div className="topbar">
            <Link to="/"><IconBtn label="Voltar"><Icons.Voltar /></IconBtn></Link>
            <h2 className="center">Sua conta</h2>
            <span style={{ width: 42 }} />
          </div>
          <div className="pad" style={{ paddingTop: 6 }}>
            <div className="card" style={{ padding: 18 }}>
              <b style={{ fontSize: 16 }}>{usuario?.nome}</b>
              <p style={{ marginTop: 4 }}>{usuario?.email}</p>
              <span className="chip mint" style={{ marginTop: 10 }}>
                {usuario?.verificado ? "E-mail confirmado" : "Confirme seu e-mail"}
              </span>
            </div>

            {uso && (
              <div className="card" style={{ padding: 18, marginTop: 12 }}>
                <b style={{ fontSize: 14 }}>Seus limites</b>
                <p className="small" style={{ marginTop: 4 }}>
                  Conversa com o Hachimi: {uso.chatHoje} de {uso.limites.chatDia} hoje, {uso.chatSemana} de {uso.limites.chatSemana} na semana.
                </p>
                <p className="small">
                  Identificar por foto: {uso.visaoSemana} de {uso.limites.visaoSemana} nesta semana.
                </p>
              </div>
            )}

            <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={async () => { await sair(); nav("/"); }}>
              Sair da conta
            </button>
            <Link to="/" style={{ textDecoration: "none" }}>
              <button className="btn btn-primary btn-block" style={{ marginTop: 10 }}>Voltar ao app</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="screen">
        <div className="topbar">
          <Link to="/"><IconBtn label="Voltar"><Icons.Voltar /></IconBtn></Link>
          <h2 className="center">Criar conta</h2>
          <span style={{ width: 42 }} />
        </div>
        <div className="pad" style={{ paddingTop: 6 }}>
          <div className="card" style={{ padding: 18, background: "linear-gradient(150deg,#edf7ef,#fffdf8 80%)" }}>
            <b style={{ fontSize: 16 }}>{etapa === "pronto" ? "Pronto, conta criada" : texto.titulo}</b>
            <p style={{ marginTop: 6 }}>
              {etapa === "pronto"
                ? "Agora é só usar. Seus pets ficam salvos no aparelho e o Hachimi já sabe quem você é."
                : texto.porque}
            </p>
          </div>

          {etapa === "email" && (
            <>
              <div className="field" style={{ marginTop: 16 }}>
                <label>Seu e-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarCodigo()}
                  placeholder="voce@email.com"
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label>Como quer ser chamado (opcional)</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Guilherme" maxLength={40} />
              </div>
              {erro && <p className="small" style={{ color: "#a33", fontWeight: 800 }}>{erro}</p>}
              <button className="btn btn-primary btn-block" disabled={ocupado} onClick={enviarCodigo}>
                {ocupado ? "Enviando…" : "Receber código por e-mail"}
              </button>
              <p className="small center" style={{ marginTop: 12 }}>
                É grátis. Sem senha: a gente manda um código de 6 dígitos.
              </p>
            </>
          )}

          {etapa === "codigo" && (
            <>
              <div className="field" style={{ marginTop: 16 }}>
                <label>Código que chegou em {email}</label>
                <input
                  inputMode="numeric"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && confirmar()}
                  placeholder="000000"
                  style={{ letterSpacing: 6, fontSize: 20, fontWeight: 800, textAlign: "center" }}
                />
              </div>
              {aviso && <p className="small" style={{ color: "var(--green-700)", fontWeight: 800 }}>{aviso}</p>}
              {erro && <p className="small" style={{ color: "#a33", fontWeight: 800 }}>{erro}</p>}
              <button className="btn btn-primary btn-block" disabled={ocupado} onClick={confirmar}>
                {ocupado ? "Confirmando…" : "Confirmar e entrar"}
              </button>
              <button
                className="btn btn-ghost btn-block"
                style={{ marginTop: 8 }}
                disabled={ocupado || segundos > 0}
                onClick={enviarCodigo}
              >
                {segundos > 0 ? `Reenviar em ${segundos}s` : "Reenviar o código"}
              </button>
              <button
                className="btn btn-ghost btn-block"
                style={{ marginTop: 8 }}
                onClick={() => { setEtapa("email"); setCodigo(""); setErro(null); }}
              >
                Trocar de e-mail
              </button>
            </>
          )}

          {etapa === "pronto" && (
            <>
              <div className="card" style={{ padding: 18, marginTop: 16, background: "var(--green-900)", border: "none" }}>
                <b style={{ color: "#fff" }}>Tudo liberado</b>
                <p style={{ color: "rgba(255,255,255,.85)", marginTop: 4 }}>
                  {uso
                    ? `${uso.limites.chatDia} conversas por dia, ${uso.limites.chatSemana} na semana, e ${uso.limites.visaoSemana} fotos por semana.`
                    : "Limites liberados para sua conta."}
                </p>
              </div>
              <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => nav(-1)}>
                Voltar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
