// PCM helpers for the narration pipeline (no dependencies).
//
// Google TTS returns LINEAR16 as a WAV file. From it we take the exact clip length and the
// moments each sentence starts (the longest pauses inside the speech), so the on-screen
// caption can change exactly when the voice moves to the next sentence.

export function parseWav(buf) {
  const u8 = new Uint8Array(buf.buffer ?? buf, buf.byteOffset ?? 0, buf.byteLength ?? buf.length);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const tag = (o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV file');
  let o = 12;
  let sampleRate = 24000;
  let channels = 1;
  let bits = 16;
  while (o + 8 <= u8.length) {
    const id = tag(o);
    const size = dv.getUint32(o + 4, true);
    if (id === 'fmt ') {
      channels = dv.getUint16(o + 10, true);
      sampleRate = dv.getUint32(o + 12, true);
      bits = dv.getUint16(o + 22, true);
    } else if (id === 'data') {
      if (bits !== 16) throw new Error(`unsupported ${bits}-bit WAV`);
      const n = Math.floor(Math.min(size, u8.length - o - 8) / 2 / channels);
      const samples = new Int16Array(n);
      for (let i = 0; i < n; i++) samples[i] = dv.getInt16(o + 8 + i * 2 * channels, true);
      return { sampleRate, channels, samples };
    }
    o += 8 + size + (size & 1);
  }
  throw new Error('WAV has no data chunk');
}

export function writeWav(samples, sampleRate = 24000) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const dv = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  dv.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  str(36, 'data');
  dv.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) dv.setInt16(44 + i * 2, samples[i], true);
  return new Uint8Array(buf);
}

export const durationMs = ({ samples, sampleRate }) => Math.round((samples.length / sampleRate) * 1000);

/**
 * Where each of `count` sentences starts (ms from clip start), found as the `count - 1`
 * longest pauses inside the speech. Returns null when the audio has fewer clear pauses than
 * sentence breaks, and the caller then falls back to an estimate.
 */
export function sentenceStarts({ samples, sampleRate }, count) {
  if (count <= 1) return [0];
  const frame = Math.round(sampleRate / 100); // 10 ms
  const rms = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let s = 0;
    for (let k = i; k < i + frame; k++) s += samples[k] * samples[k];
    rms.push(Math.sqrt(s / frame));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.9)] || 1;
  const quiet = loud * 0.06;
  const first = rms.findIndex((v) => v > quiet);
  let last = rms.length - 1;
  while (last > 0 && rms[last] <= quiet) last--;
  const runs = [];
  let start = -1;
  for (let i = first; i <= last; i++) {
    if (rms[i] <= quiet) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      if (i - start >= 12) runs.push({ start, end: i, len: i - start });
      start = -1;
    }
  }
  if (runs.length < count - 1) return null;
  const chosen = runs.sort((a, b) => b.len - a.len).slice(0, count - 1).sort((a, b) => a.start - b.start);
  return [0, ...chosen.map((r) => Math.max(0, r.end * 10 - 40))];
}
