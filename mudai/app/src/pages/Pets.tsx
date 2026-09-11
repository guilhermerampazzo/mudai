import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fotoPlanta } from "../data/plantasIndex";
import { useCatalogo } from "../lib/catalogo";
import { useConta } from "../lib/conta";
import { carregarPets, intervaloDaPlanta, precisaRegar, salvarPets, scoreSaude, estadoPet } from "../lib/pets";
import { agendarRegas, notificacoesDisponiveis, permissaoConcedida, quantosAgendados } from "../lib/notificacoes";
import { Tabbar, Topbar, IconBtn, HealthRing } from "../components/ui";
import { Icons } from "../components/icons";

export function Pets({ onChange }: { onChange?: () => void }) {
  const { buscar } = useCatalogo();
  const { verificado, pedirConta } = useConta();
  const [tick, setTick] = useState(0);
  const pets = useMemo(() => carregarPets(buscar), [buscar, tick]);
  const [temPermissao, setTemPermissao] = useState(false);

  useEffect(() => {
    permissaoConcedida().then(setTemPermissao);
  }, [tick]);

  // Mantém os lembretes alinhados com a lista atual de plantas.
  useEffect(() => {
    if (pets.length === 0) return;
    permissaoConcedida().then((ok) => {
      if (ok) agendarRegas(pets);
    });
  }, [pets]);

  const comSede = pets.filter(precisaRegar);

  const marcarRega = (id: string) => {
    const atualizados = pets.map((p) => (p.id === id ? { ...p, ultimaRegaDias: 0 } : p));
    salvarPets(atualizados);
    agendarRegas(atualizados);
    setTick((t) => t + 1);
    onChange?.();
  };

  if (pets.length === 0) {
    return (
      <div className="phone">
        <div className="screen">
          <Topbar titulo="Minhas plantas" subtitulo="Nada por aqui ainda" />
          <div className="pad" style={{ paddingTop: 10 }}>
            <div className="card center" style={{ padding: 28 }}>
              <b style={{ fontSize: 16, display: "block" }}>Você ainda não tem planta cadastrada</b>
              <p style={{ marginTop: 8 }}>
                Escolhe uma do catálogo, dá um apelido e eu passo a acompanhar a rega e a luz dela.
              </p>
              {verificado ? (
                <Link to="/pets/novo" style={{ textDecoration: "none" }}>
                  <button className="btn btn-primary btn-block" style={{ marginTop: 18 }}>Cadastrar minha primeira planta</button>
                </Link>
              ) : (
                <>
                  <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={() => pedirConta("pet")}>
                    Criar conta e cadastrar
                  </button>
                  <Link to="/" style={{ textDecoration: "none" }}>
                    <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>Só olhando por enquanto</button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <Tabbar />
      </div>
    );
  }

  return (
    <div className="phone">
      <div className="screen">
        <Topbar
          titulo="Minhas plantas"
          subtitulo={`${pets.length} ${pets.length === 1 ? "verdinha" : "verdinhas"} sob seus cuidados`}
          acao={<Link to="/pets/novo"><IconBtn label="Adicionar planta"><Icons.Plus /></IconBtn></Link>}
        />
        <div className="pad" style={{ paddingTop: 10 }}>
          {comSede.length > 0 ? (
            <div className="banner">
              <span className="small" style={{ color: "#f6df9e", fontWeight: 800 }}>PRECISA DE ÁGUA</span>
              <div className="big">{comSede.length === 1 ? `${comSede[0].apelido} tá com sede` : `${comSede.length} plantas com sede`}</div>
              <p>Toca pra marcar quando regar.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 16, background: "linear-gradient(120deg,var(--green-900),var(--green-700))", border: "none" }}>
              <b style={{ color: "#fff", fontSize: 14 }}>Todas regadas</b>
              <p style={{ color: "rgba(255,255,255,.85)", marginTop: 4 }}>
                Nenhuma planta pedindo água agora. Eu aviso quando alguma precisar.
              </p>
            </div>
          )}

          {notificacoesDisponiveis() && !temPermissao && (
            <div className="card" style={{ padding: 16, marginTop: 12 }}>
              <b style={{ fontSize: 14 }}>Ativar lembrete de rega</b>
              <p className="small" style={{ marginTop: 4 }}>
                Aviso no aparelho quando alguma planta pedir água, no ritmo de cada uma.
              </p>
              <button
                className="btn btn-primary btn-block"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  const pets = carregarPets(buscar);
                  await agendarRegas(pets);
                  setTemPermissao(await permissaoConcedida());
                  setTick((t) => t + 1);
                }}
              >
                Ativar lembretes
              </button>
            </div>
          )}

          {notificacoesDisponiveis() && temPermissao && quantosAgendados() > 0 && (
            <p className="small center" style={{ marginTop: 10 }}>
              {quantosAgendados()} lembretes agendados no aparelho.
            </p>
          )}

          {pets.map((pet) => {
            const score = scoreSaude(pet);
            const estado = estadoPet(score);
            const dias = intervaloDaPlanta(pet.planta.aguaFreqDias);
            return (
              <div key={pet.id} className="card row" style={{ padding: 14, marginTop: 12 }}>
                <Link to={`/pets/${pet.id}`} style={{ display: "contents", textDecoration: "none", color: "inherit" }}>
                  <img src={fotoPlanta(pet.planta.svg)} alt={pet.apelido} style={{ width: 64, height: 64, objectFit: "cover", background: "var(--green-50)", borderRadius: 16 }} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <b>{pet.apelido}</b>
                    <p className="small">{pet.planta.nomePopular} · {pet.local}</p>
                    <p className="small" style={{ fontWeight: 800 }}>
                      {estado.rotulo} · rega a cada {dias}d
                    </p>
                  </div>
                  <HealthRing score={score} />
                </Link>
              </div>
            );
          })}

          {comSede.length > 0 && (
            <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => marcarRega(comSede[0].id)}>
              Reguei a {comSede[0].apelido}
            </button>
          )}

          <Link to="/pets/novo" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>Adicionar outra planta</button>
          </Link>
          <div style={{ height: 10 }} />
        </div>
      </div>
      <Tabbar />
    </div>
  );
}
