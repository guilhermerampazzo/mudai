import { useState } from "react";
import { HashRouter, Link, Route, Routes, useNavigate } from "react-router-dom";
import "./styles.css";
import { Descobrir } from "./pages/Descobrir";
import { FichaPlanta } from "./pages/FichaPlanta";
import { Pets } from "./pages/Pets";
import { PetDetalhe } from "./pages/PetDetalhe";
import { NovoPet } from "./pages/NovoPet";
import { Medidor } from "./pages/Medidor";
import { Identificar } from "./pages/Identificar";
import { Chat } from "./pages/Chat";
import { Sol } from "./pages/Sol";

function Onboarding() {
  const nav = useNavigate();
  return (
    <div className="phone">
      <div className="screen">
        <div style={{ position: "relative", height: 400, overflow: "hidden", background: "var(--green-900)" }}>
          <img
            src="/plantas/monstera-deliciosa.jpg"
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(27,67,50,.15) 0%, rgba(27,67,50,.7) 62%, var(--green-900) 100%)" }} />
          <img
            src="/icone-app.png"
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
          <Link to="/" style={{ textDecoration: "none" }}><button className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>Já tenho conta</button></Link>
          <p className="small center" style={{ marginTop: 14 }}>Grátis · sem cadastro chato</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  void tick;
  return (
    <HashRouter>
      <Routes>
        <Route path="/bem-vindo" element={<Onboarding />} />
        <Route path="/" element={<Descobrir />} />
        <Route path="/planta/:slug" element={<FichaPlanta />} />
        <Route path="/pets" element={<Pets key={tick} onChange={refresh} />} />
        <Route path="/pets/novo" element={<NovoPetWrapper onAdotar={refresh} />} />
        <Route path="/pets/:id" element={<PetDetalhe onChange={refresh} />} />
        <Route path="/medidor" element={<Medidor onSalvar={refresh} />} />
        <Route path="/identificar" element={<Identificar />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/sol" element={<Sol />} />
      </Routes>
    </HashRouter>
  );
}

function NovoPetWrapper({ onAdotar }: { onAdotar: () => void }) {
  const nav = useNavigate();
  return <NovoPet onAdotar={() => { onAdotar(); nav("/pets"); }} />;
}
