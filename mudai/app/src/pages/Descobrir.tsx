import { useState } from "react";
import { Link } from "react-router-dom";
import { TAG_FILTROS, fotoPlanta } from "../data/plantasIndex";
import { filtrarPorTag, useCatalogo } from "../lib/catalogo";
import { Tabbar, Topbar, IconBtn } from "../components/ui";
import { Icons } from "../components/icons";

export function Descobrir() {
  const { plantas, origem, carregando, erro } = useCatalogo();
  const [filtro, setFiltro] = useState<string>("Todas");
  const [busca, setBusca] = useState("");
  const lista = filtrarPorTag(plantas, filtro).filter(
    (p) =>
      p.nomePopular.toLowerCase().includes(busca.toLowerCase()) ||
      p.nomeCientifico.toLowerCase().includes(busca.toLowerCase())
  );
  return (
    <div className="phone">
      <div className="screen">
        <Topbar
          titulo="Descobrir"
          subtitulo={
            carregando
              ? "Sincronizando catálogo…"
              : `${plantas.length} verdinhas${origem === "servidor" ? " atualizadas do servidor" : ""}${erro ? " · offline" : ""}`
          }
          acao={
            <Link to="/pets" aria-label="Meus pets">
              <IconBtn label="Meus pets"><Icons.Folha /></IconBtn>
            </Link>
          }
        />
        <div className="pad" style={{ paddingTop: 10 }}>
          <div className="search">
            <Icons.Search />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar planta…"
              aria-label="Buscar planta"
              style={{ border: "none", outline: "none", flex: 1, font: "inherit", background: "transparent" }}
            />
          </div>
          <div className="row" style={{ marginTop: 14, overflowX: "auto", paddingBottom: 4 }}>
            {TAG_FILTROS.map((t) => (
              <span key={t} className={`chip${filtro === t ? " active" : ""}`} onClick={() => setFiltro(t)}>{t}</span>
            ))}
          </div>
          <div className="banner" style={{ marginTop: 14 }}>
            <span className="small" style={{ color: "#f6df9e", fontWeight: 800 }}>DICA DO HACHIMI</span>
            <div className="big">Meia-sombra<br />é ouro</div>
            <p>A maioria das plantas de apartamento ama luz indireta forte.</p>
          </div>
          <h3 style={{ margin: "18px 0 12px" }}>Populares agora</h3>
          {lista.length === 0 && <p>Nenhuma planta encontrada. Tente outra busca.</p>}
          <div className="plant-grid">
            {lista.map((p) => (
              <Link key={p.slug} to={`/planta/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="plant-card">
                  <img src={fotoPlanta(p.svg)} alt={p.nomePopular} loading="lazy" />
                  <div className="info">
                    <b>{p.nomePopular}</b>
                    <span>{p.nomeCientifico}</span>
                    <div style={{ marginTop: 6 }}>
                      <span className="chip mint" style={{ fontSize: 10, padding: "5px 10px" }}>{p.tagLuz}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Tabbar />
    </div>
  );
}
