import { useState } from "react";
import { HashRouter, Link, Route, Routes, useNavigate } from "react-router-dom";
import "./styles.css";
import { CatalogoProvider } from "./lib/catalogo";
import { ContaProvider } from "./lib/conta";
import { useBotaoVoltar } from "./lib/botaoVoltar";
import { Descobrir } from "./pages/Descobrir";
import { FichaPlanta } from "./pages/FichaPlanta";
import { Pets } from "./pages/Pets";
import { PetDetalhe } from "./pages/PetDetalhe";
import { NovoPet } from "./pages/NovoPet";
import { Medidor } from "./pages/Medidor";
import { Identificar } from "./pages/Identificar";
import { Chat } from "./pages/Chat";
import { Sol } from "./pages/Sol";
import { Admin } from "./pages/Admin";
import { Entrar } from "./pages/Entrar";

function Onboarding() {
  const nav = useNavigate();
  return (
    <div className="phone">
      <div className="screen">
        <div style={{ position: "relative", height: 400, overflow: "hidden", background: "var(--green-900)" }}>
          <img
            src="plantas/monstera-deliciosa.jpg"
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(27,67,50,.15) 0%, rgba(27,67,50,.7) 62%, var(--green-900) 100%)" }} />
          <img
            src="icone-app.png"
            alt="Mudaí"
            style={{ position: "absolute", left: 24, top: "calc(28px + env(safe-area-inset-top))", width: 76, height: 76, borderRadius: 22 }}
          />
          <div style={{ position: "absolute", left: 24, right: 24, bottom: 46, color: "#fff" }}>
            <h1 style={{ color: "#fff" }}>Suas plantas<br />merecem um jardineiro</h1>
            <p style={{ color: "rgba(255,255,255,.8)", marginTop: 8 }}>
              Luz medida, sol na tela e um jardineiro que só fala de verdinha.
            </p>
          </div>
        </div>
        <div className="pad" style={{ paddingTop: 22 }}>
          <h2>Comece pelas verdinhas que você já tem</h2>
          <p style={{ marginTop: 8 }}>Adote uma planta, meça a luz do cantinho dela e eu cuido do resto do plano.</p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={() => nav("/")}>Começar</button>
          <Link to="/entrar" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>Criar conta</button>
          </Link>
          <p className="small center" style={{ marginTop: 14 }}>Grátis · sem senha</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ContaProvider>
        <CatalogoProvider>
          <VoltarDoCelular />
          <Routes>
            <Route path="/bem-vindo" element={<Onboarding />} />
            <Route path="/" element={<Descobrir />} />
            <Route path="/planta/:slug" element={<FichaPlanta />} />
            <Route path="/pets" element={<PetsComRefresh />} />
            <Route path="/pets/novo" element={<NovoPetWrapper />} />
            <Route path="/pets/:id" element={<PetDetalheWrapper />} />
            <Route path="/medidor" element={<MedidorWrapper />} />
            <Route path="/identificar" element={<Identificar />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/sol" element={<Sol />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/entrar" element={<Entrar />} />
          </Routes>
        </CatalogoProvider>
      </ContaProvider>
    </HashRouter>
  );
}

/** Cada tela que lê do armazenamento local se recarrega sozinha quando muda. */
function PetsComRefresh() {
  const [tick, setTick] = useState(0);
  return <Pets key={tick} onChange={() => setTick((t) => t + 1)} />;
}

function PetDetalheWrapper() {
  const [tick, setTick] = useState(0);
  return <PetDetalhe key={tick} onChange={() => setTick((t) => t + 1)} />;
}

function MedidorWrapper() {
  const [tick, setTick] = useState(0);
  return <Medidor key={tick} onSalvar={() => setTick((t) => t + 1)} />;
}

function NovoPetWrapper() {
  const nav = useNavigate();
  return <NovoPet onAdotar={() => nav("/pets")} />;
}

function VoltarDoCelular() {
  useBotaoVoltar();
  return null;
}
