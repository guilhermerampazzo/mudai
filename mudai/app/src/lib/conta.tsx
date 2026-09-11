import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buscarConta, sairConta, servidorConfigurado, sessaoToken, type Uso, type Usuario } from "./api";

interface ContaValor {
  usuario: Usuario | null;
  uso: Uso | null;
  carregando: boolean;
  logado: boolean;
  verificado: boolean;
  recarregar: () => void;
  sair: () => Promise<void>;
  anotarUso: (uso?: Uso) => void;
  /** Leva para a tela de criar conta, explicando o motivo. */
  pedirConta: (motivo: Motivo) => void;
}

export type Motivo = "pet" | "chat" | "identificar" | "geral";

const Contexto = createContext<ContaValor | null>(null);

export function ContaProvider({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [uso, setUso] = useState<Uso | null>(null);
  const [carregando, setCarregando] = useState(servidorConfigurado());
  const [gatilho, setGatilho] = useState(0);

  useEffect(() => {
    if (!servidorConfigurado() || !sessaoToken()) {
      setCarregando(false);
      setUsuario(null);
      setUso(null);
      return;
    }
    let vivo = true;
    setCarregando(true);
    buscarConta()
      .then((r) => {
        if (!vivo) return;
        if (r) {
          setUsuario(r.conta);
          setUso(r.uso);
        } else {
          setUsuario(null);
          setUso(null);
        }
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [gatilho]);

  const recarregar = useCallback(() => setGatilho((g) => g + 1), []);

  const sair = useCallback(async () => {
    await sairConta();
    setUsuario(null);
    setUso(null);
  }, []);

  const pedirConta = useCallback(
    (motivo: Motivo) => {
      nav(`/entrar?motivo=${motivo}`);
    },
    [nav]
  );

  const valor = useMemo<ContaValor>(
    () => ({
      usuario,
      uso,
      carregando,
      logado: Boolean(usuario),
      verificado: Boolean(usuario?.verificado),
      recarregar,
      sair,
      anotarUso: (u?: Uso) => {
        if (u) setUso(u);
      },
      pedirConta,
    }),
    [usuario, uso, carregando, recarregar, sair, pedirConta]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useConta(): ContaValor {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useConta precisa do ContaProvider");
  return ctx;
}

export const TEXTO_MOTIVO: Record<Motivo, { titulo: string; porque: string }> = {
  pet: {
    titulo: "Crie sua conta para cadastrar a planta",
    porque: "Assim ela fica salva com você, com os lembretes de rega no seu aparelho.",
  },
  chat: {
    titulo: "Crie sua conta para conversar com o Hachimi",
    porque: "O jardineiro é de graça, mas precisa saber com quem está falando.",
  },
  identificar: {
    titulo: "Crie sua conta para identificar a planta",
    porque: "Cada conta tem 20 identificações por semana. Assim ninguém abusa.",
  },
  geral: {
    titulo: "Crie sua conta no Mudaí",
    porque: "Leva um minuto. Você recebe um código no e-mail e pronto.",
  },
};
