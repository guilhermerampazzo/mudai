import { useMemo } from "react";
import { Link } from "react-router-dom";
import { buscarTodas, fotoPlanta } from "../data/plantasIndex";
import { carregarPets, scoreSaude, estadoPet, salvarPets } from "../lib/pets";
import { Tabbar, Topbar, IconBtn, HealthRing } from "../components/ui";
import { Icons } from "../components/icons";

export function Pets({ onChange }: { onChange?: () => void }) {
  const pets = useMemo(() => carregarPets(buscarTodas), []);
  const regarHoje = pets.filter((p) => p.ultimaRegaDias >= p.planta.aguaFreqDias[1]).length;

  const marcarRega = (id: string) => {
    const atualizados = pets.map((p) => (p.id === id ? { ...p, ultimaRegaDias: 0 } : p));
    salvarPets(atualizados);
    onChange?.();
  };

  return (
    <div className="phone">
      <div className="screen">
        <Topbar
          titulo="Meus pets"
          subtitulo={`${pets.length} verdinhas sob seus cuidados`}
          acao={<Link to="/pets/novo"><IconBtn label="Adotar planta"><Icons.Plus /></IconBtn></Link>}
        />
        <div className="pad" style={{ paddingTop: 10 }}>
          <div className="banner">
            <span className="small" style={{ color: "#f6df9e", fontWeight: 800 }}>REGAR HOJE</span>
            <div className="big">{regarHoje} {regarHoje === 1 ? "pet com sede" : "pets com sede"}</div>
            <p>Toque no pet para ver o plano de cuidado.</p>
          </div>
          {pets.map((pet) => {
            const score = scoreSaude(pet);
            const estado = estadoPet(score);
            return (
              <div key={pet.id} className="card row" style={{ padding: 14, marginTop: 12 }}>
                <Link to={`/pets/${pet.id}`} style={{ display: "contents", textDecoration: "none", color: "inherit" }}>
                  <img src={fotoPlanta(pet.planta.svg)} alt={pet.apelido} style={{ width: 64, height: 64, objectFit: "cover", background: "var(--green-50)", borderRadius: 16 }} />
                  <div className="grow">
                    <b>{pet.apelido}</b>
                    <p className="small">{pet.planta.nomePopular} · {pet.local}</p>
                    <p className="small" style={{ fontWeight: 800 }}>{estado.rotulo} · regada há {pet.ultimaRegaDias}d</p>
                  </div>
                  <HealthRing score={score} />
                </Link>
              </div>
            );
          })}
          <div className="row" style={{ marginTop: 14 }}>
            <Link to="/pets/novo" style={{ flex: 1, textDecoration: "none" }}>
              <button className="btn btn-ghost btn-block">Adotar nova planta</button>
            </Link>
          </div>
          {pets.filter((p) => p.ultimaRegaDias >= p.planta.aguaFreqDias[1]).slice(0, 1).map((p) => (
            <button key={p.id} className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={() => marcarRega(p.id)}>
              Marquei a rega da {p.apelido}
            </button>
          ))}
        </div>
      </div>
      <Tabbar />
    </div>
  );
}
