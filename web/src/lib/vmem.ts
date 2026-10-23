import { ReplacementResult, FrameSnapshot } from "./types";

export function runFIFO(refs: number[], numFrames: number): ReplacementResult {
  const r: ReplacementResult = { algorithm: "FIFO", pageFaults: 0, hits: 0, totalRefs: refs.length, frameSnapshots: [] };
  const q: number[] = [];
  const inFrames = new Set<number>();
  const frames = new Array(numFrames).fill(-1);
  for (const page of refs) {
    const fault = !inFrames.has(page);
    let victim: number | undefined;
    if (fault) {
      r.pageFaults++;
      if (q.length >= numFrames) {
        victim = q.shift()!;
        inFrames.delete(victim);
        frames[frames.indexOf(victim)] = page;
      } else {
        frames[frames.indexOf(-1)] = page;
      }
      q.push(page);
      inFrames.add(page);
    } else { r.hits++; }
    r.frameSnapshots.push({
      ref: page, frames: [...frames], fault, victim,
      structureLabel: "FIFO Queue (front = next victim)",
      structure: `[${q.join(" → ")}]`,
    });
  }
  return r;
}

export function runLRU(refs: number[], numFrames: number): ReplacementResult {
  const r: ReplacementResult = { algorithm: "LRU", pageFaults: 0, hits: 0, totalRefs: refs.length, frameSnapshots: [] };
  const order: number[] = [];
  const frames = new Array(numFrames).fill(-1);
  for (const page of refs) {
    const idx = order.indexOf(page);
    let victim: number | undefined;
    if (idx >= 0) {
      r.hits++;
      order.splice(idx, 1);
      order.push(page);
    } else {
      r.pageFaults++;
      if (order.length >= numFrames) {
        victim = order.shift()!;
        frames[frames.indexOf(victim)] = page;
      } else {
        frames[frames.indexOf(-1)] = page;
      }
      order.push(page);
    }
    r.frameSnapshots.push({
      ref: page, frames: [...frames], fault: idx < 0, victim,
      structureLabel: "LRU Stack (bottom = least recently used)",
      structure: `[${order.join(" → ")}]`,
    });
  }
  return r;
}

export function runOptimal(refs: number[], numFrames: number): ReplacementResult {
  const r: ReplacementResult = { algorithm: "Optimal", pageFaults: 0, hits: 0, totalRefs: refs.length, frameSnapshots: [] };
  const inFrames = new Set<number>();
  const frames = new Array(numFrames).fill(-1);
  for (let i = 0; i < refs.length; i++) {
    const page = refs[i];
    const fault = !inFrames.has(page);
    let victim: number | undefined;
    const futureMap: { page: number; nextUse: number | string }[] = [];

    if (fault) {
      r.pageFaults++;
      if (inFrames.size >= numFrames) {
        let victimPage = -1, farthest = -1;
        for (const f of inFrames) {
          let nextUse = Infinity;
          for (let j = i + 1; j < refs.length; j++) { if (refs[j] === f) { nextUse = j; break; } }
          futureMap.push({ page: f, nextUse: nextUse === Infinity ? "∞" : nextUse });
          if (nextUse > farthest) { farthest = nextUse; victimPage = f; }
        }
        victim = victimPage;
        inFrames.delete(victim);
        frames[frames.indexOf(victim)] = page;
      } else {
        frames[frames.indexOf(-1)] = page;
      }
      inFrames.add(page);
    } else {
      r.hits++;
      for (const f of inFrames) {
        let nextUse: number | string = "∞";
        for (let j = i + 1; j < refs.length; j++) { if (refs[j] === f) { nextUse = j; break; } }
        futureMap.push({ page: f, nextUse });
      }
    }

    const structStr = futureMap.length > 0
      ? futureMap.map(e => `${e.page}@${e.nextUse}`).join(", ")
      : "—";

    r.frameSnapshots.push({
      ref: page, frames: [...frames], fault, victim,
      structureLabel: "Next Use (page@step, ∞ = never)",
      structure: structStr,
    });
  }
  return r;
}

export function runClock(refs: number[], numFrames: number): ReplacementResult {
  const r: ReplacementResult = { algorithm: "Clock", pageFaults: 0, hits: 0, totalRefs: refs.length, frameSnapshots: [] };
  const frames = new Array(numFrames).fill(-1);
  const refBit = new Array(numFrames).fill(false);
  let hand = 0, count = 0;
  const inFrames = new Set<number>();
  for (const page of refs) {
    const fault = !inFrames.has(page);
    let victim: number | undefined;
    if (fault) {
      r.pageFaults++;
      if (count < numFrames) {
        frames[count] = page;
        refBit[count] = true;
        inFrames.add(page);
        count++;
      } else {
        while (refBit[hand]) { refBit[hand] = false; hand = (hand + 1) % numFrames; }
        victim = frames[hand];
        inFrames.delete(victim!);
        frames[hand] = page;
        refBit[hand] = true;
        inFrames.add(page);
        hand = (hand + 1) % numFrames;
      }
    } else {
      r.hits++;
      for (let j = 0; j < numFrames; j++) if (frames[j] === page) { refBit[j] = true; break; }
    }

    const clockStr = frames.map((f, idx) => {
      if (f < 0) return "—";
      const ptr = idx === hand % numFrames ? "►" : " ";
      return `${ptr}${f}(${refBit[idx] ? "1" : "0"})`;
    }).join(" ");

    r.frameSnapshots.push({
      ref: page, frames: [...frames], fault, victim,
      structureLabel: "Clock (►=hand, ref bit)",
      structure: clockStr,
    });
  }
  return r;
}

export const sampleRefs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];
