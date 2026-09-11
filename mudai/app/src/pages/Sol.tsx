import { useEffect, useMemo, useState } from "react";
import * as SunCalc from "suncalc";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Motion } from "@capacitor/motion";
import { buscarTodas } from "../data/plantasIndex";
import { carregarPets } from "../lib/pets";
import { Tabbar, Topbar, IconBtn } from "../components/ui";
import { Icons } from "../components/icons";

const FALLBACK = { lat: -23.5558, lng: -46.6396, nome: "São Paulo" };

function graus(rad: number): number {
  return ((rad * 180) / Math.PI + 360) % 360;
}

export function Sol() {
  const pets = useMemo(() => carregarPets(buscarTodas), []);
  const [agora, setAgora] = useState(() => new Date());
  const [norte, setNorte] = useState<number | null>(null);
  const [pos, setPos] = useState(FALLBACK);
  const [gpsOk, setGpsOk] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let ativo = true;
    let motionSub: { remove: () => void } | null = null;
    (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.requestPermissions();
          const ok = (perm as { location?: string }).location === "granted" || (perm as { coarseLocation?: string }).coarseLocation === "granted";
          if (ok && ativo) {
            const cur = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            if (ativo) {
              setPos({ lat: cur.coords.latitude, lng: cur.coords.longitude, nome: "Você está aqui" });
              setGpsOk(true);
            }
            Geolocation.watchPosition({ enableHighAccuracy: true }, (p) => {
              if (p && ativo) {
                setPos({ lat: p.coords.latitude, lng: p.coords.longitude, nome: "Você está aqui" });
                setGpsOk(true);
              }
            });
          }
        } else if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (p) => ativo && (setPos({ lat: p.coords.latitude, lng: p.coords.longitude, nome: "Você está aqui" }), setGpsOk(true)),
            () => {},
            { timeout: 10000 }
          );
        }
      } catch { /* mantém fallback */ }
      try {
        if (Capacitor.isNativePlatform()) {
          motionSub = await Motion.addListener("orientation", (e) => {
            if (typeof e.alpha === "number" && ativo) setNorte((360 - e.alpha) % 360);
          });
        }
      } catch { /* fallback web abaixo */ }
    })();
    const onOrient = (e: DeviceOrientationEvent) => {
      const v = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof v === "number") setNorte(v);
      else if (typeof e.alpha === "number") setNorte((360 - e.alpha) % 360);
    };
    window.addEventListener("deviceorientation", onOrient as EventListener);
    return () => {
      ativo = false;
      motionSub?.remove();
      window.removeEventListener("deviceorientation", onOrient as EventListener);
    };
  }, []);

  const sc = SunCalc.getPosition(agora, pos.lat, pos.lng);
  const azimute = graus(sc.azimuth + Math.PI);
  const elevacao = ((sc as unknown as { altitude: number }).altitude * 180) / Math.PI;
  const solAcima = elevacao > 0;
  const horas = SunCalc.getTimes(agora, pos.lat, pos.lng);
  const nascer = horas.sunrise ?? new Date(agora.getTime() - 6 * 3600e3);
  const por = horas.sunset ?? new Date(agora.getTime() + 6 * 3600e3);
  const pico = horas.solarNoon ?? new Date((nascer.getTime() + por.getTime()) / 2);
  const dia = { sunrise: nascer, sunset: por };
  const fmt = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const rel = norte == null ? azimute : (azimute - norte + 360) % 360;
  const raio = 88;
  const solX = 125 + raio * Math.sin((rel * Math.PI) / 180);
  const solY = 125 - raio * Math.cos((rel * Math.PI) / 180);
  const pontos: string[] = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  const ponto = pontos[Math.round(azimute / 45) % 8];

  return (
    <div className="phone">
      <div className="screen">
        <Topbar
          titulo="Posição do sol"
          subtitulo={`${pos.nome} · ${fmt(agora)}${gpsOk ? "" : " · buscando GPS…"}`}
          acao={<IconBtn label="Recentralizar" onClick={() => setAgora(new Date())}><Icons.Compass /></IconBtn>}
        />
        <div className="pad" style={{ paddingTop: 10 }}>
          <div style={{ position: "relative", width: 250, height: 250, margin: "6px auto", borderRadius: "50%", background: "radial-gradient(circle,#fffdf8 0 52%,#d8f3dc 53% 78%,#95d5b2 79%)", border: "1.5px solid var(--line)" }}>
            <span style={tick(8, "50%", true)}>N</span>
            <span style={tick(undefined, "50%", false, true)}>S</span>
            <span style={tick("50%", 10, false, false, true)}>O</span>
            <span style={tick("50%", undefined, false, false, false, true)}>L</span>
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 4, height: 104, transformOrigin: "50% 0", transform: `rotate(${rel}deg)`, background: "linear-gradient(180deg,var(--terra),transparent)", borderRadius: 4 }} />
            <div style={{ position: "absolute", width: 46, height: 46, borderRadius: "50%", background: solAcima ? "var(--mustard)" : "#8b9a91", border: "4px solid #fff", boxShadow: "0 4px 14px rgba(233,180,76,.6)", display: "flex", alignItems: "center", justifyContent: "center", left: solX - 23, top: solY - 23 }}>
              <Icons.Sun />
            </div>
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
              <b style={{ fontSize: 26 }}>{Math.round(azimute)}°</b><br />
              <span className="small" style={{ fontWeight: 800 }}>
                {solAcima ? `${ponto} · elev. ${Math.round(elevacao)}°` : `Sol abaixo do horizonte · nasce ${fmt(nascer)}`}
              </span>
            </div>
          </div>
          {norte == null && <p className="small center" style={{ marginTop: 6 }}>Gire o celular para ativar a bússola.</p>}
          <div className="row" style={{ marginTop: 6 }}>
            {[["NASCE", fmt(nascer)], ["PICO", fmt(pico)], ["PÕE", fmt(por)]].map(([r, v]) => (
              <div key={r} className="card grow center" style={{ padding: 12 }}>
                <span className="small">{r}</span><br /><b>{v}</b>
              </div>
            ))}
          </div>
          <div style={{ height: 110, borderRadius: "var(--r-md)", background: "linear-gradient(180deg,#fdf3d7,#fffdf8)", border: "1.5px solid var(--mustard-soft)", position: "relative", overflow: "hidden", marginTop: 12 }}>
            <svg viewBox="0 0 320 110" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              <path d="M20 95 Q 160 -30 300 95" fill="none" stroke="#e9b44c" strokeWidth="5" strokeLinecap="round" />
              <circle cx={20 + (300 - 20) * diaFrac(agora, dia)} cy={arcoY(agora, dia)} r="13" fill="#e9b44c" stroke="#fff" strokeWidth="4" />
              <circle cx="20" cy="95" r="7" fill="#c96f4a" /><circle cx="300" cy="95" r="7" fill="#c96f4a" />
            </svg>
          </div>
          <p className="small center" style={{ marginTop: 6 }}>Arco de hoje · o círculo marca onde o sol está agora</p>
          <div className="card" style={{ padding: 16, marginTop: 12, background: "linear-gradient(120deg,var(--green-900),var(--green-700))", border: "none" }}>
            <b style={{ color: "#fff", fontSize: 14 }}>Minha janela · boa para meia-sombra</b>
            <p style={{ color: "rgba(255,255,255,.8)", marginTop: 4 }}>
              {pets.length > 0 ? `${pets[0].apelido} (${pets[0].planta.nomePopular.toLowerCase()}) se dá bem com a luz daqui.` : "Adote um pet para eu cruzar com a luz da sua janela."}
            </p>
          </div>
          <div style={{ height: 10 }} />
        </div>
      </div>
      <Tabbar />
    </div>
  );
}

function tick(top?: number | string, left?: number | string, centerX = false, bottom = false, vCenter = false, right = false): React.CSSProperties {
  const s: React.CSSProperties = { position: "absolute", fontSize: 11, fontWeight: 800, color: "var(--muted)" };
  if (top !== undefined) s.top = top;
  if (left !== undefined) s.left = left;
  if (centerX) s.transform = "translateX(-50%)";
  if (bottom) { s.bottom = 8; }
  if (vCenter) s.transform = "translateY(-50%)";
  if (right) s.right = 10;
  return s;
}

function diaFrac(agora: Date, horas: { sunrise: Date; sunset: Date }): number {
  const f = (agora.getTime() - horas.sunrise.getTime()) / (horas.sunset.getTime() - horas.sunrise.getTime());
  return Math.min(1, Math.max(0, f));
}

function arcoY(agora: Date, horas: { sunrise: Date; sunset: Date }): number {
  const f = diaFrac(agora, horas);
  return 95 - Math.sin(f * Math.PI) * 110;
}
