"use client";

import { useState } from "react";

type ModuleKey = "process" | "scheduler" | "sync" | "deadlock" | "memory" | "vmem" | "filesystem" | "daios";
type Scenario = { title: string; setup: string; expected: string; explanation: string; recommendation: string };

const SCENARIOS: Record<ModuleKey, { heading: string; intro: string; scenarios: Scenario[] }> = {
  process: {
    heading: "Process & Thread — worked examples",
    intro: "Use these reference scenarios while creating processes, adding threads, and changing process states below.",
    scenarios: [
      { title: "Process lifecycle", setup: "Create P1 with burst 6, arrival 0, memory 256. Move it NEW → READY → RUNNING → TERMINATED.", expected: "Each transition should follow the allowed lifecycle; TERMINATED has no outgoing transition.", explanation: "The OS tracks a process through states. A transition that skips a required state is rejected by this simulator's state model.", recommendation: "If a transition is unavailable, inspect the current state before changing it." },
      { title: "Threads share a process", setup: "Create P1 with burst 10, then add two threads with burst 3 each.", expected: "The threads belong to P1 and their combined assigned burst must not exceed the process budget.", explanation: "Threads share the process's address space and resources, while each thread has its own execution state.", recommendation: "Use threads for concurrent work inside one process; use separate processes for stronger isolation." },
      { title: "Waiting and wake-up", setup: "Move a RUNNING process to WAITING, then return it to READY.", expected: "A waiting process is not eligible to run until it becomes READY again.", explanation: "Waiting represents an event or resource dependency, not CPU execution.", recommendation: "Investigate synchronization or I/O when many processes remain WAITING." },
    ],
  },
  scheduler: {
    heading: "CPU Scheduling — worked examples",
    intro: "The shared workload is used by both this laboratory and DAIOS Intelligence. Try the sample, then change arrivals to create idle intervals.",
    scenarios: [
      { title: "FCFS with a late arrival", setup: "P1: burst 2, arrival 0. P2: burst 3, arrival 10. Select FCFS.", expected: "P1 runs 0–2, CPU idles 2–10, and P2 runs 10–13. Busy 5, idle 8, elapsed 13.", explanation: "Idle time is a real gap in the simulated timeline. It must not be counted as process execution.", recommendation: "For this workload, compare policies but note that no scheduler can execute P2 before it arrives." },
      { title: "Round Robin fairness", setup: "P1 burst 7 and P2 burst 5, both arrival 0; set quantum to 2.", expected: "The scheduler alternates runnable processes in time slices until each finishes.", explanation: "A smaller quantum can improve responsiveness but can increase context switches; context-switch cost is not modeled here.", recommendation: "Compare response time and completion order, not only average waiting time." },
      { title: "SJF trade-off", setup: "P1 burst 8, P2 burst 2, P3 burst 4; all arrive at 0.", expected: "Non-preemptive SJF favors shorter available jobs.", explanation: "SJF can reduce average waiting time when burst lengths are known, but long jobs may wait longer.", recommendation: "Use the objective selector to compare waiting, response, turnaround, and throughput." },
    ],
  },
  sync: {
    heading: "Synchronization — worked examples",
    intro: "Select a problem below and run the simulator. These examples describe the invariant to look for in its event log.",
    scenarios: [
      { title: "Producer–consumer bounded buffer", setup: "Buffer capacity 3; produce 5 items with one consumer.", expected: "The buffer occupancy must always remain between 0 and 3.", explanation: "The empty/full semaphores count available slots and items; a mutex protects the buffer update.", recommendation: "If a producer blocks, inspect whether the buffer is full and whether the consumer can signal an empty slot." },
      { title: "Readers–writers", setup: "Run 3 readers and 2 writers.", expected: "Multiple readers may share access, but a writer requires exclusive access.", explanation: "The shared data must not be written while other readers or writers access it incompatibly.", recommendation: "Discuss starvation policy as well as mutual exclusion; correctness and fairness are different properties." },
      { title: "Dining philosophers", setup: "Run 5 philosophers competing for 5 forks.", expected: "Each philosopher needs two forks to eat; the simulator uses ordered locking to avoid circular wait.", explanation: "Acquiring resources in a global order breaks the circular-wait condition for this model.", recommendation: "Compare the ordered-locking solution with a naive strategy that can deadlock." },
    ],
  },
  deadlock: {
    heading: "Deadlock Analyzer — worked examples",
    intro: "Use the graph demo and Banker's Algorithm tab to compare cycle detection with safe-state analysis.",
    scenarios: [
      { title: "Resource-allocation cycle", setup: "P0 holds R1 and requests R0; P1 holds R2 and requests R1; P2 holds R0 and requests R2.", expected: "The wait-for dependencies form a cycle P0 → P1 → P2 → P0.", explanation: "A cycle in a single-instance resource-allocation graph indicates deadlock. With multiple instances, a cycle alone is not always sufficient.", recommendation: "Inspect resource instances and ownership before concluding that every cycle is a deadlock." },
      { title: "Banker's safety test", setup: "Use the built-in safe-state example, then change an allocation or available-resource count.", expected: "A safe state has at least one sequence in which each process can finish using currently available plus released resources.", explanation: "Unsafe means no safe sequence is currently demonstrated; it does not necessarily mean the system is already deadlocked.", recommendation: "Prefer granting a request only when the resulting state remains safe, under Banker's assumptions." },
      { title: "Four necessary conditions", setup: "Review mutual exclusion, hold-and-wait, no preemption, and circular wait.", expected: "Deadlock requires all four conditions to hold simultaneously.", explanation: "Breaking any one necessary condition can prevent deadlock in the modeled system.", recommendation: "Choose a prevention strategy and state the trade-off it introduces." },
    ],
  },
  memory: {
    heading: "Memory Management — worked examples",
    intro: "Load the fragmented demo, compare allocation strategies, and inspect the memory map before and after allocation.",
    scenarios: [
      { title: "First Fit", setup: "Free holes 100, 300, 200; request 180 units.", expected: "First Fit chooses the first hole large enough: 300 units.", explanation: "First Fit scans from the beginning and stops at the first suitable hole.", recommendation: "Try Best Fit and Worst Fit on the same holes to compare placement and leftover fragments." },
      { title: "External fragmentation", setup: "Free holes 50, 150, 80; request 200 units.", expected: "Total free memory is 280, but no single hole can satisfy the request.", explanation: "Free memory exists in separated holes; total free capacity alone is not sufficient for contiguous allocation.", recommendation: "Try compaction or a non-contiguous allocation design when the model permits it." },
      { title: "Internal fragmentation", setup: "Allocate a 60-unit request from a fixed 100-unit partition.", expected: "40 units remain unused inside the allocated partition if the model uses fixed partitions.", explanation: "Internal fragmentation is wasted space inside an allocated region; external fragmentation is free space split into holes.", recommendation: "Choose allocation granularity based on the workload and explain the space-versus-management trade-off." },
    ],
  },
  vmem: {
    heading: "Virtual Memory — worked examples",
    intro: "Enter the same page-reference string and frame count to compare FIFO, LRU, Optimal, and Clock.",
    scenarios: [
      { title: "Repeated page references", setup: "Reference string 1,2,3,1,2,4,1,2,3,4 with 3 frames.", expected: "Repeated references may become hits if their pages remain resident; replacement choice affects later faults.", explanation: "A page fault occurs when the referenced page is absent from all frames. A hit means it is already resident.", recommendation: "Compare fault counts on identical inputs; Optimal is a theoretical lower-bound comparator because it uses future knowledge." },
      { title: "FIFO versus LRU", setup: "Use 3 frames and reference string 1,2,3,1,4,1,2,5.", expected: "FIFO evicts the oldest loaded page; LRU evicts the least recently used page.", explanation: "The policies use different definitions of which resident page is the best victim.", recommendation: "Try multiple strings before claiming one algorithm always performs better." },
      { title: "Frame count sensitivity", setup: "Keep the reference string fixed and change frames from 3 to 4.", expected: "Fault count may change; FIFO can exhibit Belady's anomaly for certain strings.", explanation: "More frames often help, but FIFO is not guaranteed to have monotonically fewer faults.", recommendation: "Use the comparison chart and mention the exact input when explaining a result." },
    ],
  },
  filesystem: {
    heading: "File System — worked examples",
    intro: "Use the terminal's help command, then compare the simulated file operations and block I/O analyzer.",
    scenarios: [
      { title: "Directory and file operations", setup: "Run help, create a directory, create a file, write data, list contents, then read the file.", expected: "The directory listing and file contents should reflect successful operations.", explanation: "Directories map names to filesystem entries; file metadata and content are distinct concepts.", recommendation: "Check operation output after each step; failed commands should not be assumed to have changed state." },
      { title: "Allocation strategies", setup: "Compare contiguous, linked, and indexed allocation for a file that spans multiple blocks.", expected: "Contiguous allocation offers good sequential access but needs a large run; linked and indexed layouts trade access behavior for metadata/pointer overhead.", explanation: "Allocation strategy changes fragmentation, sequential performance, and random-access costs.", recommendation: "Choose a strategy based on the access pattern, file growth, and metadata cost." },
      { title: "Disk scheduling", setup: "Use a request queue with head position 50 and requests on both sides of the head.", expected: "FCFS follows arrival order; SSTF favors nearby requests; SCAN sweeps in a direction.", explanation: "Total head movement is a model of seek distance, not a measurement of physical disk latency.", recommendation: "Compare movement and fairness; SSTF can starve distant requests." },
    ],
  },
  daios: {
    heading: "DAIOS Intelligence — workload and recommendation gallery",
    intro: "These are explainable reference scenarios spanning all seven OS labs. Live telemetry history is shown separately below; examples are not presented as measured hardware data.",
    scenarios: [
      { title: "CPU-bound workload", setup: "Several long CPU bursts arrive close together.", expected: "CPU busy time may be high, and waiting time can rise under some policies.", explanation: "The scheduler can change order and responsiveness, but it cannot remove the total CPU work required.", recommendation: "Compare SJF for average waiting and Round Robin for responsiveness; select the metric that matches the goal." },
      { title: "Late-arriving workload", setup: "P1 has burst 2 at time 0; P2 has burst 3 at time 10.", expected: "The CPU is idle from time 2 to 10 if no other process is ready.", explanation: "Busy time is the sum of execution segments; elapsed time includes idle intervals between the first and last timeline boundaries.", recommendation: "Do not describe idle time as CPU inefficiency without considering arrival patterns and workload demand." },
      { title: "Synchronization contention", setup: "Multiple simulated workers compete for a shared critical section.", expected: "Some workers may wait while another owns the lock.", explanation: "Contention is a wait-state issue; it should not automatically be attributed to CPU scheduling.", recommendation: "Inspect lock scope and synchronization ordering before proposing a scheduler change." },
      { title: "Deadlock risk", setup: "Two or more processes hold resources while requesting resources held by others.", expected: "A cycle or an unsafe allocation state may be reported depending on the analysis used.", explanation: "Cycle detection and Banker's safety analysis answer related but different questions.", recommendation: "Show the exact cycle or safety sequence as evidence; do not label every unsafe state a confirmed deadlock." },
      { title: "Fragmented memory", setup: "Total free memory is enough, but the largest free hole is smaller than the requested block.", expected: "A contiguous allocation can fail despite sufficient total free space.", explanation: "External fragmentation concerns the shape of free space, not only its sum.", recommendation: "Compare allocation algorithms or compaction, and report the largest-hole and total-free metrics." },
      { title: "High page-fault workload", setup: "A reference string repeatedly accesses more pages than fit in the available frames.", expected: "The replacement policy affects page faults and hits.", explanation: "Page faults are simulated memory events, not directly observed physical disk I/O.", recommendation: "Compare FIFO, LRU, and Optimal on the same reference string and frame count." },
      { title: "File access pattern", setup: "A workload performs sequential reads and random access across file blocks.", expected: "Allocation and disk scheduling choices may change modeled block access costs.", explanation: "The filesystem I/O analyzer's costs are model outputs and depend on its configured assumptions.", recommendation: "Report the assumptions and compare strategies on identical requests." },
    ],
  },
};

export function LearningGuide({ module }: { module: ModuleKey }) {
  const content = SCENARIOS[module];
  const [selected, setSelected] = useState(0);
  const scenario = content.scenarios[Math.min(selected, content.scenarios.length - 1)];
  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3" aria-label={content.heading}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sample scenarios · learning guide</p>
        <h2 className="mt-1 text-lg font-semibold">{content.heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{content.intro}</p>
      </div>
      <label className="block max-w-2xl space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Choose an example</span>
        <select value={selected} onChange={e => setSelected(Number(e.target.value))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          {content.scenarios.map((item, index) => <option key={item.title} value={index}>{index + 1}. {item.title}</option>)}
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold">Setup</h3>
          <p className="mt-1 text-sm text-muted-foreground">{scenario.setup}</p>
          <h3 className="mt-3 text-sm font-semibold">Expected result</h3>
          <p className="mt-1 text-sm text-muted-foreground">{scenario.expected}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold">Why it works this way</h3>
          <p className="mt-1 text-sm text-muted-foreground">{scenario.explanation}</p>
          <h3 className="mt-3 text-sm font-semibold">Recommendation</h3>
          <p className="mt-1 text-sm text-muted-foreground">{scenario.recommendation}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Reference scenario for learning. Results depend on the simulator inputs and its stated assumptions; this panel does not claim to measure your physical computer.</p>
    </section>
  );
}
