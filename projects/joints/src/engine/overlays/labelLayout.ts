export interface LabelBox {
  id: string;
  /** Anchor point on screen (px). */
  ax: number;
  ay: number;
  /** Preferred label attachment point (px) - the end of the leader line. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Label extends to the right of (x,y) when "start", to the left when "end". */
  align: "start" | "end";
  priority: number;
}

export interface PlacedLabel extends LabelBox {
  left: number;
  top: number;
}

const boxOf = (l: LabelBox, y = l.y) => ({ left: l.align === "start" ? l.x : l.x - l.w, top: y - l.h / 2, right: l.align === "start" ? l.x + l.w : l.x, bottom: y + l.h / 2 });

const overlaps = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>, pad: number) =>
  a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad;

/**
 * Deterministic label de-overlap: labels keep their horizontal attachment and are pushed apart vertically
 * (higher priority labels move less), then clamped to the viewport. Pure function for unit testing.
 */
export function layoutLabels(
  input: readonly LabelBox[],
  viewport: { width: number; height: number; insetTop?: number; insetBottom?: number; reserved?: { left: number; top: number; right: number; bottom: number } },
  pad = 4,
  iterations = 48,
): PlacedLabel[] {
  const labels = input.map((l) => ({ ...l }));
  // A panel on the stage (an exploration, the recall challenge) owns its rectangle. A label that would sit under it is
  // slid clear to the right before the vertical de-overlap runs, so the leader line lengthens instead of the label
  // disappearing behind the panel. If it cannot fit to the right it is left where it is: the vertical pass and the
  // final clamp still apply, and a cramped label is better than one pushed off screen.
  const reserved = viewport.reserved;
  if (reserved) {
    for (const l of labels) {
      const box = boxOf(l);
      if (box.bottom < reserved.top || box.top > reserved.bottom) continue;
      if (box.right < reserved.left || box.left > reserved.right) continue;
      const shift = reserved.right + pad - box.left;
      if (shift > 0 && box.right + shift <= viewport.width - pad) {
        l.x += shift;
        continue;
      }
      // On a narrow layout the panel spans the width, so there is nowhere to go sideways: lift the label above the
      // panel instead, or drop it below if the space above is shorter than the label.
      const above = reserved.top - pad - l.h / 2;
      const below = reserved.bottom + pad + l.h / 2;
      const minY = (viewport.insetTop ?? 0) + l.h / 2 + pad;
      const maxY = viewport.height - (viewport.insetBottom ?? 0) - l.h / 2 - pad;
      if (above >= minY) l.y = above;
      else if (below <= maxY) l.y = below;
    }
  }
  // Step 16F: a label that shares the reserved rectangle's columns must stay on the side of it where it now sits. The
  // vertical de-overlap below knew only the insets, so it could push a label that had been dropped below the rectangle
  // straight back under it (the body map's "Fixed" label under the topic heading, on a phone).
  const bound = new Map<LabelBox, { floor?: number; ceiling?: number }>();
  if (reserved) {
    for (const l of labels) {
      const box = boxOf(l);
      if (box.right < reserved.left || box.left > reserved.right) continue;
      const floor = reserved.bottom + pad + l.h / 2;
      const ceiling = reserved.top - pad - l.h / 2;
      const lo = (viewport.insetTop ?? 0) + l.h / 2 + pad;
      const hi = viewport.height - (viewport.insetBottom ?? 0) - l.h / 2 - pad;
      if (l.y >= floor - 0.5 && floor <= hi) bound.set(l, { floor });
      else if (l.y <= ceiling + 0.5 && ceiling >= lo) bound.set(l, { ceiling });
    }
  }
  const minY = (l: LabelBox) => Math.max((viewport.insetTop ?? 0) + l.h / 2 + pad, bound.get(l)?.floor ?? -Infinity);
  const maxY = (l: LabelBox) => Math.min(viewport.height - (viewport.insetBottom ?? 0) - l.h / 2 - pad, bound.get(l)?.ceiling ?? Infinity);
  const clampY = (l: LabelBox, y: number) => Math.min(maxY(l), Math.max(minY(l), y));
  const ys = labels.map((l) => clampY(l, l.y));
  const order = labels.map((_, i) => i).sort((i, j) => ys[i] - ys[j] || labels[i].id.localeCompare(labels[j].id));
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let a = 0; a < order.length; a++) {
      for (let b = a + 1; b < order.length; b++) {
        const i = order[a];
        const j = order[b];
        const bi = boxOf(labels[i], ys[i]);
        const bj = boxOf(labels[j], ys[j]);
        if (!overlaps(bi, bj, pad)) continue;
        const need = (labels[i].h + labels[j].h) / 2 + pad - Math.abs(ys[j] - ys[i]);
        if (need <= 0) continue;
        const wi = labels[i].priority >= labels[j].priority ? 0.3 : 0.7;
        const dir = ys[j] >= ys[i] ? 1 : -1;
        // Clamp inside the iteration: a label pinned against an inset pushes its neighbour further instead of being
        // pushed back into it by a final clamp.
        const desiredI = ys[i] - dir * need * wi;
        const yi = clampY(labels[i], desiredI);
        // whatever label i could not move (pinned) is taken up by label j
        const yj = clampY(labels[j], ys[j] + dir * need * (1 - wi) + (yi - desiredI));
        if (Math.abs(yi - ys[i]) + Math.abs(yj - ys[j]) < 1e-6) continue;
        ys[i] = yi;
        ys[j] = yj;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return labels.map((l, i) => {
    const y = Math.min(maxY(l), Math.max(minY(l), ys[i]));
    const box = boxOf(l, y);
    const left = Math.min(viewport.width - l.w - pad, Math.max(pad, box.left));
    return { ...l, y, left, top: box.top };
  });
}

/** Count of pairwise overlaps (for tests / QA). */
export function countOverlaps(placed: readonly PlacedLabel[], pad = 0): number {
  let n = 0;
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a.left < b.left + b.w + pad && b.left < a.left + a.w + pad && a.top < b.top + b.h + pad && b.top < a.top + a.h + pad) n++;
    }
  return n;
}
