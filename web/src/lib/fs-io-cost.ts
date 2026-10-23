export type Operation =
  | "insert-begin"
  | "insert-middle"
  | "insert-end"
  | "remove-begin"
  | "remove-middle"
  | "remove-end";

export type Strategy = "contiguous" | "linked" | "indexed";

export interface IOResult {
  strategy: Strategy;
  strategyLabel: string;
  reads: number;
  writes: number;
  total: number;
  steps: string[];
}

export interface AnalysisConfig {
  linkedHasTailPointer: boolean;
}

export const DEFAULT_CONFIG: AnalysisConfig = {
  linkedHasTailPointer: false,
};

export const OPERATIONS: { id: Operation; label: string; group: "Insert" | "Remove" }[] = [
  { id: "insert-begin",  label: "Insert at Beginning", group: "Insert" },
  { id: "insert-middle", label: "Insert in Middle",    group: "Insert" },
  { id: "insert-end",    label: "Insert at End",       group: "Insert" },
  { id: "remove-begin",  label: "Remove from Beginning", group: "Remove" },
  { id: "remove-middle", label: "Remove from Middle",    group: "Remove" },
  { id: "remove-end",    label: "Remove from End",       group: "Remove" },
];

// ── Assumptions ──────────────────────────────────────────────────────
// • FCB (File Control Block) is already in memory → 0 disk I/O for
//   any FCB read or write (start pointer, length, etc.)
// • For indexed allocation the index block is already in memory →
//   reading/writing the index block itself costs 0 disk I/O.
// • Only actual disk block reads/writes are counted.
// • Contiguous: required free space exists; shifts are unavoidable
//   for begin/middle inserts.
// • Linked: traversing the chain requires reading each block from disk;
//   updating a pointer inside a block requires writing that block.
// • Indexed (single-level): pointer array manipulation happens in memory.

function contiguousIO(n: number, pos: number, op: Operation): IOResult {
  let reads = 0, writes = 0;
  const steps: string[] = [];

  switch (op) {
    // Read all n blocks, write them shifted one position right, then write new block
    case "insert-begin": {
      steps.push(`Read all ${n} blocks into memory: ${n} reads`);
      reads += n;
      steps.push(`Write ${n} blocks back shifted one position to the right: ${n} writes`);
      writes += n;
      steps.push(`Write the new block at position 0: 1 write`);
      writes += 1;
      break;
    }
    // Shift blocks [pos..n-1] right: read + write each, then write new block
    case "insert-middle": {
      const shift = n - pos;
      steps.push(`Read ${shift} blocks [pos ${pos}..${n - 1}] into memory: ${shift} reads`);
      reads += shift;
      steps.push(`Write ${shift} blocks back shifted one position right: ${shift} writes`);
      writes += shift;
      steps.push(`Write the new block at position ${pos}: 1 write`);
      writes += 1;
      break;
    }
    // Append: just write the new block at position n
    case "insert-end":
      steps.push(`Write the new block at position ${n} (append): 1 write`);
      writes += 1;
      steps.push(`Update file length in FCB (already in memory): 0 I/O`);
      break;
    // Shift blocks [1..n-1] left by one: read + write each
    case "remove-begin": {
      const shift = n - 1;
      steps.push(`Shift ${shift} remaining blocks [1..${n - 1}] left by one position`);
      steps.push(`  Read each block + write it one position back: ${shift} reads + ${shift} writes = ${2 * shift} I/O`);
      reads += shift;
      writes += shift;
      steps.push(`Update file length in FCB (already in memory): 0 I/O`);
      break;
    }
    // Shift blocks [pos+1..n-1] left: read + write each
    case "remove-middle": {
      const shift = n - pos - 1;
      steps.push(`Shift ${shift} blocks [${pos + 1}..${n - 1}] left by one position`);
      steps.push(`  Read each block + write it one position back: ${shift} reads + ${shift} writes = ${2 * shift} I/O`);
      reads += shift;
      writes += shift;
      steps.push(`Update file length in FCB (already in memory): 0 I/O`);
      break;
    }
    // Just shorten the file; FCB update is in memory
    case "remove-end":
      steps.push(`No blocks need to be moved (last block removed in place)`);
      steps.push(`Update file length in FCB (already in memory): 0 I/O`);
      break;
  }

  return { strategy: "contiguous", strategyLabel: "Contiguous", reads, writes, total: reads + writes, steps };
}

function linkedIO(n: number, pos: number, op: Operation, cfg: AnalysisConfig): IOResult {
  let reads = 0, writes = 0;
  const steps: string[] = [];

  switch (op) {
    // Write new block pointing to old head; update FCB start pointer in memory
    case "insert-begin":
      steps.push(`Write new block (its next pointer → old first block): 1 write`);
      writes += 1;
      steps.push(`Update FCB start pointer in memory → new block: 0 I/O`);
      break;
    // Traverse pos blocks to reach predecessor, write new block, update predecessor pointer
    case "insert-middle": {
      steps.push(`Traverse ${pos} blocks from head to reach predecessor at position ${pos - 1}: ${pos} reads`);
      reads += pos;
      steps.push(`Write new block (next pointer → predecessor's old next): 1 write`);
      writes += 1;
      steps.push(`Update predecessor block's next pointer → new block: 1 write`);
      writes += 1;
      break;
    }
    case "insert-end":
      if (cfg.linkedHasTailPointer) {
        // FCB has tail pointer → we know last block address directly
        steps.push(`FCB has tail pointer → last block address known (0 traversal)`);
        steps.push(`Read last block (to access its content for pointer update): 1 read`);
        reads += 1;
        steps.push(`Write new block (next = null): 1 write`);
        writes += 1;
        steps.push(`Write updated last block (next pointer → new block): 1 write`);
        writes += 1;
      } else {
        // Must traverse entire chain to find last block
        const traverse = n - 1;
        steps.push(`No tail pointer — traverse ${traverse} blocks to find last block: ${traverse} reads`);
        reads += traverse;
        steps.push(`Write new block (next = null): 1 write`);
        writes += 1;
        steps.push(`Write updated last block (next pointer → new block): 1 write`);
        writes += 1;
      }
      break;
    // Read first block to discover second block address; FCB update in memory
    case "remove-begin":
      steps.push(`Read first block to find second block's address: 1 read`);
      reads += 1;
      steps.push(`Update FCB start pointer in memory → second block: 0 I/O`);
      break;
    // Traverse to predecessor and current block, then update predecessor's pointer
    case "remove-middle": {
      const traverse = pos + 1;
      steps.push(`Traverse ${traverse} blocks [0..${pos}] to reach predecessor and read target block's next pointer: ${traverse} reads`);
      reads += traverse;
      steps.push(`Update predecessor block's next pointer to skip removed block: 1 write`);
      writes += 1;
      break;
    }
    // Traverse to second-to-last, set its next to null
    case "remove-end": {
      const traverse = n - 1;
      steps.push(`Traverse ${traverse} blocks to reach second-to-last block: ${traverse} reads`);
      reads += traverse;
      steps.push(`Write second-to-last block (set next pointer to null / EOF): 1 write`);
      writes += 1;
      break;
    }
  }

  return { strategy: "linked", strategyLabel: "Linked", reads, writes, total: reads + writes, steps };
}

// Index block is already in memory. Pointer array manipulation (shift,
// insert, remove) happens entirely in RAM — only the new data block
// write counts as disk I/O for insertions. Removals cost 0 disk I/O.
function indexedIO(_n: number, _pos: number, op: Operation): IOResult {
  let reads = 0, writes = 0;
  const steps: string[] = [];

  if (op.startsWith("insert")) {
    steps.push(`Write new data block to disk: 1 write`);
    writes += 1;
    steps.push(`Update in-memory index block (insert pointer at correct position): 0 I/O`);
  } else {
    steps.push(`Remove block address from in-memory index block: 0 I/O`);
    steps.push(`No disk I/O required — index update happens entirely in memory`);
  }

  return { strategy: "indexed", strategyLabel: "Indexed (single-level)", reads, writes, total: reads + writes, steps };
}

export function analyzeIO(n: number, pos: number, op: Operation, cfg: AnalysisConfig = DEFAULT_CONFIG): IOResult[] {
  return [
    contiguousIO(n, pos, op),
    linkedIO(n, pos, op, cfg),
    indexedIO(n, pos, op),
  ];
}

export function resolvePosition(n: number, op: Operation, customPos: number): number {
  switch (op) {
    case "insert-begin":
    case "remove-begin":
      return 0;
    case "insert-end":
    case "remove-end":
      return n - 1;
    case "insert-middle":
    case "remove-middle":
      return Math.max(1, Math.min(customPos, n - 1));
  }
}
