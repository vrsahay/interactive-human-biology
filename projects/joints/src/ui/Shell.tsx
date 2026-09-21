import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { DEFAULT_JOINT, JOINT_CONTENT } from "../content";
import type { LayerState, PresetToken } from "../content/types";
import { App } from "../engine/core/App";
import type { Dof } from "../engine/joints/dof";
import { installQaApi } from "../engine/qa/qaApi";
import { FlexionSlider } from "./FlexionSlider";
import { PerfHud } from "./PerfHud";
import { createUiStore, type UiStore } from "./store";

const ROLE_TEXT: Record<string, string> = {
  bone_fixed: "Bone · stays still",
  bone_moving: "Bone · moves with the joint",
  follow: "Carried by the moving segment",
  attached_soft: "Soft tissue · moves with the moving segment",
  spanning_soft: "Soft tissue · spans the joint",
  context: "Context structure",
};

const BEHAVIOUR_TEXT: Record<string, string> = {
  stationary: "Stationary during flexion",
  moves_with_forearm: "Moves with the forearm about the hinge axis",
  cross_joint_stationary: "Static placeholder · hidden while the joint moves",
  context_stationary: "Static context · hidden while the joint moves",
};

function resolvePreset(token: PresetToken, dof: Dof): number {
  if (token === "min") return dof.min;
  if (token === "max") return dof.max;
  if (token === "neutral") return dof.neutral;
  return Math.min(dof.max, Math.max(dof.min, token));
}

export function Shell({ qa, fixedPixelRatio }: { qa: boolean; fixedPixelRatio?: number }) {
  const content = JOINT_CONTENT[new URLSearchParams(location.search).get("joint") ?? DEFAULT_JOINT] ?? JOINT_CONTENT[DEFAULT_JOINT];
  const stageRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<App | null>(null);
  const [store, setStore] = useState<UiStore | null>(null);
  const [hud, setHud] = useState(new URLSearchParams(location.search).has("dev"));

  useEffect(() => {
    const instance = new App(stageRef.current!, content, { qa, fixedPixelRatio });
    const s = createUiStore(instance.events, content.initialLayers);
    setApp(instance);
    setStore(s);
    if (qa) installQaApi(instance);
    instance.start().then(() => {
      s.pose.value = instance.joint.currentPose();
    }).catch(() => undefined);
    return () => {
      s.dispose();
      instance.dispose();
    };
  }, []);

  const status = store?.status.value ?? { phase: "loading", step: "Starting" };
  const ready = status.phase === "ready" && app;

  return (
    <div class="shell">
      <header class="shell__header">
        <div class="brand">
          <span class="brand__eyebrow">Types of joints · Vertical slice</span>
          <h1 class="brand__title">{content.title}</h1>
          <p class="brand__subtitle">{content.subtitle}</p>
        </div>
      </header>

      <main class="stage-wrap">
        <div class="stage" ref={stageRef} data-testid="stage" aria-label={`${content.title} 3D view`} role="img" />
        {status.phase === "loading" && (
          <div class="stage-status" role="status" aria-live="polite" data-testid="loading">
            <span class="spinner" aria-hidden="true" />
            <span>{status.step}…</span>
          </div>
        )}
        {status.phase === "error" && (
          <div class="stage-status stage-status--error" role="alert" data-testid="error">
            <strong>The 3D model could not be loaded.</strong>
            <span class="stage-status__detail">{status.message}</span>
          </div>
        )}
        {ready && store && <StageHints app={app} store={store} hint={content.dragHint} />}
      </main>

      <aside class="panel" aria-label={`${content.title} controls`}>
        {ready && store ? <Controls app={app} store={store} /> : <div class="panel__placeholder" aria-hidden="true" />}
        <footer class="panel__footer">
          <button type="button" class="link-button" aria-pressed={hud} onClick={() => setHud(!hud)}>
            {hud ? "Hide" : "Show"} performance
          </button>
        </footer>
      </aside>
      {ready && hud && <PerfHud app={app} />}
    </div>
  );
}

function StageHints({ app, store, hint }: { app: App; store: UiStore; hint: string }) {
  const motion = store.motion.value;
  const hiddenMsg = motion.hiddenByMotion > 0 ? `${motion.hiddenByMotion} static structure${motion.hiddenByMotion === 1 ? "" : "s"} hidden while the joint is moved (they do not follow the motion)` : null;
  return (
    <>
      <p class="stage-hint" data-dragging={motion.dragging || undefined}>
        {hint}
      </p>
      {hiddenMsg && (
        <p class="stage-note" role="status" data-testid="motion-visibility-note">
          {hiddenMsg}
        </p>
      )}
      <div class="view-buttons" role="group" aria-label="Camera">
        {[
          ["overview", "Overview"],
          ["closeUp", "Close-up"],
        ].map(([preset, label]) => (
          <button key={preset} type="button" class="chip" aria-pressed={store.cameraPreset.value === preset} data-testid={`view-${preset}`} onClick={() => app.view(preset)}>
            {label}
          </button>
        ))}
        <button type="button" class="chip" data-testid="view-reset" onClick={() => app.resetView()}>
          Reset view
        </button>
      </div>
    </>
  );
}

function Controls({ app, store }: { app: App; store: UiStore }) {
  const joint = app.joint;
  const dofs = joint.dofs;
  const layers = store.layers.value;
  const selection = store.selection.value;
  const tiers = store.tiers.value;
  const semantics = app.manifest.semantics;

  const layerToggles: [keyof LayerState, string, string?][] = useMemo(
    () => [
      ["labels", "Labels"],
      ["axis", "Hinge axis & motion arc"],
      ["bands", "Schematic ligament bands"],
      ["detail", "Ligaments & capsule", "detail"],
      ["context", "Muscles & shoulder (context)", "context"],
    ],
    [],
  );

  return (
    <div class="controls">
      {dofs.map((dof) => {
        const c = app.content.dofControls[dof.id];
        if (!c) return null;
        const value = store.pose.value[dof.id] ?? joint.getDof(dof.id);
        return (
          <section class="card" key={dof.id} aria-labelledby={`dof-${dof.id}-heading`}>
            <h2 class="card__title" id={`dof-${dof.id}-heading`}>
              Movement
            </h2>
            <FlexionSlider id={`dof-${dof.id}`} dof={dof} content={c} value={value} onChange={(v, source) => app.setDof(dof.id, v, source)} />
            <div class="preset-row" role="group" aria-label="Preset angles">
              {c.presets.map((token) => {
                const target = resolvePreset(token, dof);
                return (
                  <button key={String(token)} type="button" class="chip chip--preset" data-testid={`preset-${target}`} aria-pressed={Math.round(value) === target} onClick={() => app.animateDof(dof.id, target, "preset")}>
                    {target}°
                  </button>
                );
              })}
              <button type="button" class="chip chip--reset" data-testid="reset-pose" onClick={() => app.resetPose()}>
                Reset
              </button>
            </div>
            <p class="fineprint" data-testid="range-note">
              {dof.neutral}° is {c.neutralDescription}. The {dof.min}–{dof.max}° range is {dof.rangeApproximate ? "approximate and pending a cited reference" : dof.rangeStatus}.
            </p>
            <details class="fineprint-details">
              <summary>How neutral is defined</summary>
              <p>{semantics.neutral_definition}</p>
            </details>
          </section>
        );
      })}

      <section class="card" aria-labelledby="layers-heading">
        <h2 class="card__title" id="layers-heading">
          Show
        </h2>
        <ul class="toggle-list">
          {layerToggles.map(([key, label, tier]) => {
            const state = tier ? tiers[tier as "detail" | "context"] : undefined;
            return (
              <li key={key}>
                <label class="toggle">
                  <input type="checkbox" data-testid={`layer-${key}`} checked={layers[key] as boolean} onChange={(e) => app.setLayer(key, (e.currentTarget as HTMLInputElement).checked)} />
                  <span class="toggle__switch" aria-hidden="true" />
                  <span class="toggle__label">{label}</span>
                  {state === "loading" && <span class="toggle__meta">loading…</span>}
                  {state === "error" && <span class="toggle__meta toggle__meta--error">failed</span>}
                </label>
              </li>
            );
          })}
        </ul>
        {layers.bands && <p class="fineprint">Bands are schematic lines between attachment points, not simulated ligaments. Their changing length is not ligament strain.</p>}
      </section>

      <section class="card" aria-labelledby="selection-heading" aria-live="polite">
        <h2 class="card__title" id="selection-heading">
          Selected
        </h2>
        {selection ? (
          <div class="selection" data-testid="selection" data-structure-id={selection.structureId}>
            <p class="selection__name">{selection.label}</p>
            <p class="selection__meta">{ROLE_TEXT[selection.role] ?? selection.role}</p>
            <p class="selection__meta">{BEHAVIOUR_TEXT[selection.motionBehavior] ?? selection.motionBehavior}</p>
            <button type="button" class="link-button" onClick={() => app.select(null)}>
              Clear selection
            </button>
          </div>
        ) : (
          <p class="fineprint" data-testid="selection-empty">
            Click or tap a bone to identify it.
          </p>
        )}
      </section>
    </div>
  );
}
