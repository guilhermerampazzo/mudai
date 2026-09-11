import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fotoPlanta } from "../data/plantasIndex";
import { useCatalogo } from "../lib/catalogo";
import { carregarPets, salvarPets, scoreSaude, estadoPet, dicaPet } from "../lib/pets";
import { IconBtn } from "../components/ui";
import { Icons } from "../components/icons";

export function PetDetalhe({ onChange }: { onChange?: () => void }) {
  const { id } = useParams();
  const { buscar } = useCatalogo();
  const pets = useMemo(() => carregarPets(buscar), [buscar]);
  const [, setTick] = useState(0);
  const pet = pets.find((p) => p.id === id);
  if (!pet) {
    return (
      <div className="phone"><div className="screen"><div className="pad">
        <h2>Pet não encontrado</h2><Link to="/pets">Voltar</Link>
      </div></div></div>
    );
  }
  const score = scoreSaude(pet);
  const estado = estadoPet(score);

  const regar = () => {
    const atualizados = pets.map((p) => (p.id === pet.id ? { ...p, ultimaRegaDias: 0 } : p));
    salvarPets(atualizados);
    pet.ultimaRegaDias = 0;
    setTick((t) => t + 1);
    onChange?.();
  };

  return (
    <div className="phone">
      <div className="screen">
        <div className="topbar">
          <Link to="/pets"><IconBtn label="Voltar"><Icons.Voltar /></IconBtn></Link>
          <h2 className="center">{pet.apelido}</h2>
          <span style={{ width: 42 }} />
        </div>
        <div className="pad" style={{ paddingTop: 6 }}>
          <div className="card center" style={{ padding: 22, background: "linear-gradient(150deg,#d8f3dc,#fffdf8 75%)" }}>
            <img src={fotoPlanta(pet.planta.svg)} alt={pet.apelido} style={{ width: 130, height: 130, objectFit: "cover", borderRadius: 22 }} />
            <h2 style={{ marginTop: 8 }}>{estado.rotulo}: {pet.apelido} {score >= 85 ? "está feliz" : "precisa de você"}</h2>
            <p>Saúde {score}/100 · {pet.planta.nomePopular} · {pet.local}</p>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <div className="card grow center" style={{ padding: 14 }}>
              <b style={{ fontSize: 22 }}>{pet.ultimoLux?.toLocaleString("pt-BR") ?? "—"}</b>
              <p className="small">lux medido</p>
            </div>
            <div className="card grow center" style={{ padding: 14 }}>
              <b style={{ fontSize: 22 }}>{pet.tempAmbiente}°</b>
              <p className="small">ambiente</p>
            </div>
            <div className="card grow center" style={{ padding: 14 }}>
              <b style={{ fontSize: 22 }}>{pet.ultimaRegaDias}d</b>
              <p className="small">desde a rega</p>
            </div>
          </div>
          <div className="card" style={{ padding: 16, marginTop: 14, background: "linear-gradient(120deg,var(--green-900),var(--green-700))", border: "none" }}>
            <b style={{ color: "#fff", fontSize: 14 }}>Plano do Hachimi</b>
            <p style={{ color: "rgba(255,255,255,.85)", marginTop: 4 }}>{dicaPet(pet)}</p>
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary grow" onClick={regar}>Reguei agora</button>
            <Link to="/medidor" className="grow" style={{ textDecoration: "none" }}>
              <button className="btn btn-ghost btn-block">Medir luz</button>
            </Link>
          </div>
          <div style={{ height: 10 }} />
        </div>
      </div>
    </div>
  );
}
