import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCatalogo } from "../lib/catalogo";
import {
  enviarFoto,
  removerPlanta,
  salvarPlanta,
  salvarTokenAdmin,
  servidorConfigurado,
  tokenAdmin,
  urlFoto,
  validarToken,
} from "../lib/api";
import { IconBtn } from "../components/ui";
import { Icons } from "../components/icons";

const LUZ = ["Sombra", "Meia-sombra", "Luz indireta", "Sol pleno"];
const DIFICULDADE = ["", "Iniciante", "Intermediário", "Avançado"];

interface Formulario {
  slug: string;
  nomePopular: string;
  nomeCientifico: string;
  descricao: string;
  foto: string;
  tagLuz: string;
  dificuldade: number;
  aguaNivel: number;
  aguaFreqMin: number;
  aguaFreqMax: number;
  luxMin: number;
  luxMax: number;
  tempMin: number;
  tempMax: number;
  toxicaPets: boolean;
  tags: string;
}

const VAZIO: Formulario = {
  slug: "",
  nomePopular: "",
  nomeCientifico: "",
  descricao: "",
  foto: "",
  tagLuz: "Meia-sombra",
  dificuldade: 1,
  aguaNivel: 3,
  aguaFreqMin: 7,
  aguaFreqMax: 10,
  luxMin: 1000,
  luxMax: 5000,
  tempMin: 18,
  tempMax: 30,
  toxicaPets: false,
  tags: "",
};

export function Admin() {
  const { plantas, origem, carregando, recarregar } = useCatalogo();
  const [token, setToken] = useState(tokenAdmin());
  const [entrando, setEntrando] = useState(false);
  const [logado, setLogado] = useState(Boolean(tokenAdmin()));
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return plantas;
    return plantas.filter(
      (p) => p.nomePopular.toLowerCase().includes(t) || p.nomeCientifico.toLowerCase().includes(t)
    );
  }, [plantas, busca]);

  const entrar = async () => {
    setEntrando(true);
    setErroLogin(null);
    salvarTokenAdmin(token);
    const ok = await validarToken();
    setEntrando(false);
    if (ok) {
      setLogado(true);
      recarregar();
    } else {
      setErroLogin("Token não confere. Confira no .env do servidor (ADMIN_TOKEN).");
      salvarTokenAdmin("");
    }
  };

  const subirFoto = async (f: File | undefined) => {
    if (!f) return;
    setEnviando(true);
    setAviso(null);
    const r = await enviarFoto(f);
    setEnviando(false);
    if (r.ok && r.foto) {
      setForm((a) => ({ ...a, foto: r.foto! }));
      setAviso("Foto enviada.");
    } else {
      setAviso(`Falha ao enviar foto: ${r.erro ?? "erro"}`);
    }
  };

  const salvar = async () => {
    if (!form.nomePopular.trim() || !form.nomeCientifico.trim() || !form.descricao.trim()) {
      setAviso("Preencha nome popular, nome científico e descrição.");
      return;
    }
    if (!form.foto.trim()) {
      setAviso("Envie uma foto antes de salvar.");
      return;
    }
    setEnviando(true);
    setAviso(null);
    const r = await salvarPlanta({
      slug: form.slug || undefined,
      nomePopular: form.nomePopular.trim(),
      nomeCientifico: form.nomeCientifico.trim(),
      descricao: form.descricao.trim(),
      foto: form.foto.trim(),
      tagLuz: form.tagLuz,
      dificuldade: Number(form.dificuldade),
      aguaNivel: Number(form.aguaNivel),
      aguaFreqDias: [Number(form.aguaFreqMin), Number(form.aguaFreqMax)],
      luxMin: Number(form.luxMin),
      luxMax: Number(form.luxMax),
      tempMin: Number(form.tempMin),
      tempMax: Number(form.tempMax),
      toxicaPets: form.toxicaPets,
      tags: form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean),
    });
    setEnviando(false);
    if (r.ok) {
      setAviso(editando ? "Planta atualizada." : "Planta cadastrada. Já aparece no app.");
      setForm(VAZIO);
      setEditando(null);
      recarregar();
    } else {
      setAviso(`Não salvou: ${r.erro ?? "erro"}`);
    }
  };

  const editar = (slug: string) => {
    const p = plantas.find((x) => x.slug === slug);
    if (!p) return;
    setForm({
      slug: p.slug,
      nomePopular: p.nomePopular,
      nomeCientifico: p.nomeCientifico,
      descricao: p.descricao,
      foto: p.svg,
      tagLuz: p.tagLuz,
      dificuldade: p.dificuldade,
      aguaNivel: p.aguaNivel,
      aguaFreqMin: p.aguaFreqDias[0],
      aguaFreqMax: p.aguaFreqDias[1],
      luxMin: p.luxMin,
      luxMax: p.luxMax,
      tempMin: p.tempMin,
      tempMax: p.tempMax,
      toxicaPets: p.toxicaPets,
      tags: p.tags.join(", "),
    });
    setEditando(slug);
    setAviso(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const excluir = async (slug: string) => {
    if (!window.confirm(`Remover "${slug}" do catálogo? Some do app também.`)) return;
    const r = await removerPlanta(slug);
    if (r.ok) {
      setAviso("Planta removida.");
      recarregar();
    } else {
      setAviso(`Não removeu: ${r.erro ?? "erro"}`);
    }
  };

  if (!servidorConfigurado()) {
    return (
      <div className="phone"><div className="screen"><div className="pad">
        <h2>Painel indisponível</h2>
        <p>Este painel precisa do servidor configurado (VITE_API_URL).</p>
        <Link to="/">Voltar ao app</Link>
      </div></div></div>
    );
  }

  if (!logado) {
    return (
      <div className="phone">
        <div className="screen">
          <div className="pad" style={{ paddingTop: 40 }}>
            <h1>Painel de plantas</h1>
            <p style={{ marginTop: 8 }}>Entre com o token de administrador para cadastrar e editar plantas.</p>
            <div className="field" style={{ marginTop: 20 }}>
              <label>Token de administrador</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && entrar()}
                placeholder="ADMIN_TOKEN"
              />
            </div>
            {erroLogin && <p className="small" style={{ color: "#a33", fontWeight: 800 }}>{erroLogin}</p>}
            <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={entrando} onClick={entrar}>
              {entrando ? "Entrando…" : "Entrar"}
            </button>
            <Link to="/" style={{ textDecoration: "none" }}>
              <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>Voltar ao app</button>
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
          <h2 className="center">Painel de plantas</h2>
          <span style={{ width: 42 }} />
        </div>
        <div className="pad" style={{ paddingTop: 6 }}>
          <div className="card" style={{ padding: 14 }}>
            <b style={{ fontSize: 13.5 }}>
              {plantas.length} plantas · fonte {origem === "servidor" ? "do servidor" : "local do app"}
            </b>
            <p className="small">
              {carregando ? "Sincronizando…" : "Tudo que você salvar aqui aparece no app na próxima abertura."}
            </p>
          </div>

          <h3 style={{ margin: "18px 0 10px" }}>{editando ? `Editando ${editando}` : "Nova planta"}</h3>
          <div className="card" style={{ padding: 16 }}>
            <div className="field">
              <label>Nome popular</label>
              <input value={form.nomePopular} onChange={(e) => setForm({ ...form, nomePopular: e.target.value })} placeholder="Ex.: Jiboia" />
            </div>
            <div className="field">
              <label>Nome científico</label>
              <input value={form.nomeCientifico} onChange={(e) => setForm({ ...form, nomeCientifico: e.target.value })} placeholder="Ex.: Epipremnum aureum" />
            </div>
            <div className="field">
              <label>Descrição</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Duas linhas sobre a planta" />
            </div>

            <div className="field">
              <label>Foto</label>
              <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => subirFoto(e.target.files?.[0])} />
              <div className="row">
                {form.foto ? (
                  <img src={urlFoto(form.foto)} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 12 }} />
                ) : (
                  <span className="icon-btn"><Icons.Camera /></span>
                )}
                <button className="btn btn-ghost grow" onClick={() => arquivo.current?.click()} disabled={enviando}>
                  {enviando ? "Enviando…" : form.foto ? "Trocar foto" : "Escolher foto"}
                </button>
              </div>
            </div>

            <div className="field">
              <label>Luz ideal</label>
              <div className="row" style={{ flexWrap: "wrap" }}>
                {LUZ.map((l) => (
                  <span key={l} className={`chip${form.tagLuz === l ? " active" : ""}`} onClick={() => setForm({ ...form, tagLuz: l })}>{l}</span>
                ))}
              </div>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <div className="field grow">
                <label>Rega (dias, de)</label>
                <input type="number" value={form.aguaFreqMin} onChange={(e) => setForm({ ...form, aguaFreqMin: Number(e.target.value) })} />
              </div>
              <div className="field grow">
                <label>até</label>
                <input type="number" value={form.aguaFreqMax} onChange={(e) => setForm({ ...form, aguaFreqMax: Number(e.target.value) })} />
              </div>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <div className="field grow">
                <label>Lux mínimo</label>
                <input type="number" value={form.luxMin} onChange={(e) => setForm({ ...form, luxMin: Number(e.target.value) })} />
              </div>
              <div className="field grow">
                <label>Lux máximo</label>
                <input type="number" value={form.luxMax} onChange={(e) => setForm({ ...form, luxMax: Number(e.target.value) })} />
              </div>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <div className="field grow">
                <label>Temp. mín</label>
                <input type="number" value={form.tempMin} onChange={(e) => setForm({ ...form, tempMin: Number(e.target.value) })} />
              </div>
              <div className="field grow">
                <label>Temp. máx</label>
                <input type="number" value={form.tempMax} onChange={(e) => setForm({ ...form, tempMax: Number(e.target.value) })} />
              </div>
            </div>

            <div className="field">
              <label>Dificuldade</label>
              <div className="row">
                {[1, 2, 3].map((d) => (
                  <span key={d} className={`chip${form.dificuldade === d ? " active" : ""}`} onClick={() => setForm({ ...form, dificuldade: d })}>
                    {DIFICULDADE[d]}
                  </span>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Tags (separadas por vírgula)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="meia-sombra, iniciante, pendente" />
            </div>

            <div className="field">
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={form.toxicaPets} onChange={(e) => setForm({ ...form, toxicaPets: e.target.checked })} style={{ width: "auto" }} />
                Tóxica para pets
              </label>
            </div>

            {aviso && <p className="small" style={{ color: aviso.startsWith("Não") || aviso.startsWith("Falha") || aviso.startsWith("Preencha") || aviso.startsWith("Envie") ? "#a33" : "var(--green-700)", fontWeight: 800 }}>{aviso}</p>}

            <button className="btn btn-primary btn-block" style={{ marginTop: 6 }} disabled={enviando} onClick={salvar}>
              {editando ? "Salvar alterações" : "Cadastrar planta"}
            </button>
            {editando && (
              <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => { setEditando(null); setForm(VAZIO); setAviso(null); }}>
                Cancelar edição
              </button>
            )}
          </div>

          <h3 style={{ margin: "20px 0 10px" }}>Catálogo ({lista.length})</h3>
          <div className="search" style={{ marginBottom: 12 }}>
            <Icons.Search />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar planta…"
              aria-label="Buscar planta no catálogo"
              style={{ border: "none", outline: "none", flex: 1, font: "inherit", background: "transparent" }}
            />
          </div>
          {lista.slice(0, 60).map((p) => (
            <div key={p.slug} className="card row" style={{ padding: 10, marginBottom: 8 }}>
              <img src={urlFoto(p.svg)} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 10 }} />
              <div className="grow" style={{ minWidth: 0 }}>
                <b style={{ fontSize: 13 }}>{p.nomePopular}</b>
                <p className="small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.slug}</p>
              </div>
              <span className="chip" style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => editar(p.slug)}>Editar</span>
              <span className="chip" style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => excluir(p.slug)}>Excluir</span>
            </div>
          ))}
          {lista.length > 60 && <p className="small">Mostrando as 60 primeiras. Use a busca para achar outras.</p>}
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}
