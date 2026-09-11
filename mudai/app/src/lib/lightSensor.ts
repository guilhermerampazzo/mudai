import { registerPlugin } from "@capacitor/core";

export interface LuxEvent {
  lux: number;
}

export interface LightSensorPlugin {
  start(): Promise<void>;
  stop(): Promise<void>;
  getMaxRange(): Promise<{ maxRange: number; disponivel: boolean }>;
  addListener(event: "lux", cb: (e: LuxEvent) => void): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

export const LightSensor = registerPlugin<LightSensorPlugin>("LightSensor");
