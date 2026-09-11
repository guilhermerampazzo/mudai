import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/** Abas principais do app (barra de baixo). */
const ABAS = ["/pets", "/medidor", "/identificar", "/chat", "/sol"];

/**
 * Faz o botão de voltar do Android navegar dentro do app em vez de fechar.
 * Ordem: volta uma tela; se já estiver numa aba, vai para a home;
 * se já estiver na home, aí sim sai do app.
 */
export function useBotaoVoltar() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let vivo = true;
    let alca: { remove: () => void } | null = null;

    App.addListener("backButton", () => {
      if (!vivo) return;

      if (pathname === "/") {
        App.exitApp();
        return;
      }
      if (ABAS.includes(pathname) || pathname === "/bem-vindo") {
        nav("/", { replace: true });
        return;
      }
      if (window.history.length > 1) {
        nav(-1);
        return;
      }
      nav("/", { replace: true });
    }).then((h) => {
      alca = h;
    });

    return () => {
      vivo = false;
      alca?.remove();
    };
  }, [nav, pathname]);
}
