import { signal, type Signal } from "@preact/signals";
import type { LayerState } from "../content/types";
import type { AppEvents, AppStatus, SelectionInfo } from "../engine/core/App";
import type { EventBus } from "../engine/core/EventBus";
import type { TierName } from "../engine/assets/manifestTypes";

export interface UiStore {
  status: Signal<AppStatus>;
  pose: Signal<Record<string, number>>;
  selection: Signal<SelectionInfo | null>;
  layers: Signal<LayerState>;
  motion: Signal<AppEvents["motion"]>;
  tiers: Signal<Partial<Record<TierName, AppEvents["tier"]["state"]>>>;
  hover: Signal<AppEvents["hover"]>;
  cameraPreset: Signal<string | null>;
  cameraMode: Signal<"guided" | "free">;
  interaction: Signal<AppEvents["interaction"]>;
  dispose: () => void;
}

/** Bridges engine events into Preact signals. The UI reads signals; it changes state only through App/JointController methods. */
export function createUiStore(events: EventBus<AppEvents>, initialLayers: LayerState): UiStore {
  const store = {
    status: signal<AppStatus>({ phase: "loading", step: "Starting" }),
    pose: signal<Record<string, number>>({}),
    selection: signal<SelectionInfo | null>(null),
    layers: signal<LayerState>(initialLayers),
    motion: signal<AppEvents["motion"]>({ posed: false, moving: false, hiddenByMotion: 0, dragging: false }),
    tiers: signal<Partial<Record<TierName, AppEvents["tier"]["state"]>>>({ core: "loading" }),
    hover: signal<AppEvents["hover"]>({ structureId: null, draggable: false }),
    cameraPreset: signal<string | null>(null),
    cameraMode: signal<"guided" | "free">("guided"),
    interaction: signal<AppEvents["interaction"]>({ mode: "free", picking: true, dofRange: {} }),
  };
  const offs = [
    events.on("status", (s) => {
      store.status.value = s;
      if (s.phase === "ready") store.tiers.value = { ...store.tiers.value, core: "loaded" };
    }),
    events.on("pose", (p) => (store.pose.value = { ...store.pose.value, [p.dofId]: p.value })),
    events.on("selection", (s) => (store.selection.value = s)),
    events.on("layers", (l) => (store.layers.value = l)),
    events.on("motion", (m) => {
      const prev = store.motion.value;
      if (prev.posed !== m.posed || prev.moving !== m.moving || prev.hiddenByMotion !== m.hiddenByMotion || prev.dragging !== m.dragging) store.motion.value = m;
    }),
    events.on("tier", (t) => (store.tiers.value = { ...store.tiers.value, [t.tier]: t.state })),
    events.on("hover", (h) => (store.hover.value = h)),
    events.on("interaction", (i) => (store.interaction.value = i)),
    events.on("camera", (c) => {
      store.cameraPreset.value = c.preset;
      store.cameraMode.value = c.mode;
    }),
  ];
  return { ...store, dispose: () => offs.forEach((off) => off()) };
}
