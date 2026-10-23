import { MemoryBlock } from "./types";

export function createMemory(totalSize: number): MemoryBlock[] {
  return [{ start: 0, size: totalSize, pid: -1 }];
}

function splitAndAllocate(blocks: MemoryBlock[], idx: number, pid: number, size: number): MemoryBlock[] {
  const b = { ...blocks[idx] };
  const result = [...blocks];
  if (b.size > size) {
    result.splice(idx, 1, { start: b.start, size, pid }, { start: b.start + size, size: b.size - size, pid: -1 });
  } else {
    result[idx] = { ...b, pid };
  }
  return result;
}

export interface AllocResult {
  blocks: MemoryBlock[];
  chosenIdx: number;
  chosenBlock: MemoryBlock;
  reason: string;
}

export function allocateFirstFit(blocks: MemoryBlock[], pid: number, size: number): AllocResult | null {
  const freeBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.pid === -1 && b.size >= size);
  if (freeBlocks.length === 0) return null;
  const { b, i } = freeBlocks[0];
  return {
    blocks: splitAndAllocate(blocks, i, pid, size),
    chosenIdx: i,
    chosenBlock: b,
    reason: `First Fit: scanned from start, chose the FIRST suitable hole (${b.size} @ ${b.start})`,
  };
}

export function allocateBestFit(blocks: MemoryBlock[], pid: number, size: number): AllocResult | null {
  const freeBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.pid === -1 && b.size >= size);
  if (freeBlocks.length === 0) return null;
  freeBlocks.sort((a, b) => a.b.size - b.b.size);
  const { b, i } = freeBlocks[0];
  const allSizes = freeBlocks.map(f => f.b.size).join(", ");
  return {
    blocks: splitAndAllocate(blocks, i, pid, size),
    chosenIdx: i,
    chosenBlock: b,
    reason: `Best Fit: from holes [${allSizes}], chose SMALLEST sufficient hole (${b.size} @ ${b.start})`,
  };
}

export function allocateWorstFit(blocks: MemoryBlock[], pid: number, size: number): AllocResult | null {
  const freeBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.pid === -1 && b.size >= size);
  if (freeBlocks.length === 0) return null;
  freeBlocks.sort((a, b) => b.b.size - a.b.size);
  const { b, i } = freeBlocks[0];
  const allSizes = freeBlocks.map(f => f.b.size).join(", ");
  return {
    blocks: splitAndAllocate(blocks, i, pid, size),
    chosenIdx: i,
    chosenBlock: b,
    reason: `Worst Fit: from holes [${allSizes}], chose LARGEST hole (${b.size} @ ${b.start})`,
  };
}

export function previewAllocation(blocks: MemoryBlock[], size: number): { first: number; best: number; worst: number } | null {
  const freeBlocks = blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.pid === -1 && b.size >= size);
  if (freeBlocks.length === 0) return null;
  const first = freeBlocks[0].i;
  const best = freeBlocks.reduce((min, cur) => cur.b.size < min.b.size ? cur : min).i;
  const worst = freeBlocks.reduce((max, cur) => cur.b.size > max.b.size ? cur : max).i;
  return { first, best, worst };
}

export function deallocate(blocks: MemoryBlock[], pid: number): MemoryBlock[] {
  const result = blocks.map((b) => (b.pid === pid ? { ...b, pid: -1 } : { ...b }));
  return mergeFree(result);
}

function mergeFree(blocks: MemoryBlock[]): MemoryBlock[] {
  const result: MemoryBlock[] = [];
  for (const b of blocks) {
    const last = result[result.length - 1];
    if (last && last.pid === -1 && b.pid === -1) {
      last.size += b.size;
    } else {
      result.push({ ...b });
    }
  }
  return result;
}

export function compact(blocks: MemoryBlock[]): MemoryBlock[] {
  const allocated: MemoryBlock[] = [];
  let offset = 0, totalSize = 0;
  for (const b of blocks) {
    totalSize += b.size;
    if (b.pid !== -1) {
      allocated.push({ start: offset, size: b.size, pid: b.pid });
      offset += b.size;
    }
  }
  if (offset < totalSize) allocated.push({ start: offset, size: totalSize - offset, pid: -1 });
  return allocated;
}

export function externalFragmentation(blocks: MemoryBlock[]): number {
  let total = 0, maxFree = 0;
  for (const b of blocks) {
    if (b.pid === -1) { total += b.size; maxFree = Math.max(maxFree, b.size); }
  }
  return total - maxFree;
}

export function totalFree(blocks: MemoryBlock[]): number {
  return blocks.filter((b) => b.pid === -1).reduce((s, b) => s + b.size, 0);
}

export function createFragmentedDemo(totalSize: number): { blocks: MemoryBlock[]; nextPid: number } {
  const blocks: MemoryBlock[] = [
    { start: 0,   size: 100, pid: 1 },
    { start: 100, size: 50,  pid: -1 },
    { start: 150, size: 200, pid: 2 },
    { start: 350, size: 150, pid: -1 },
    { start: 500, size: 80,  pid: 3 },
    { start: 580, size: 300, pid: -1 },
    { start: 880, size: 60,  pid: 4 },
    { start: 940, size: 84,  pid: -1 },
  ];
  return { blocks, nextPid: 5 };
}
