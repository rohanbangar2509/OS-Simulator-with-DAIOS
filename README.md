# Mini Operating System Simulator

A **user-level educational OS lab** that demonstrates process management, CPU scheduling, synchronization, deadlock analysis, memory management, virtual memory, and file systems through seven interactive modules.

## Purpose

Makes abstract OS concepts concrete: processes & threads, scheduling (FCFS, SJF, RR, Priority, MLFQ), synchronization (mutex, semaphore; Producer-Consumer, Readers-Writers, Dining Philosophers, Sleeping Barber), deadlocks (RAG, Banker's), memory partitioning (first/best/worst fit, compaction), virtual memory (FIFO/LRU/Optimal/Clock), and a FAT-like file system with a Block I/O Cost Analyzer.

website:  https://mini-os-simulator-ten.vercel.app
---

## Requirements

- **C++17** compiler (GCC 7+, Clang 5+, MSVC 2017+)
- **CMake** 3.16+
- **pthreads** (for Module 3; standard on Linux/macOS)
- No external libraries — C++ standard library only

---

## Build and Run

```bash
cd "mini OS simulator"
mkdir build && cd build
cmake ..
make -j$(nproc)   # Linux  |  make -j$(sysctl -n hw.ncpu)  # macOS
./mini_os_sim
```

Choose a module (1–7) from the main menu; each has its own submenu.

---

## Overview — Terminal and Web UI

The **terminal** version uses a text menu (1–7), ANSI colors, and bordered tables. Module 7 uses a shell-style prompt (`minifs:/$`). The **web** version (see [Web Version](#web-version) below) offers the same modules with a visual UI.

### Screenshots (Web version)

| Module | Screenshot | Description |
|--------|------------|-------------|
| **CPU Scheduling** | ![CPU Scheduling](img/cpu%20scheduling.png) | Same workload with FCFS, SJF, RR, Priority, MLFQ — Gantt chart, metrics, and comparison. |
| **Synchronization** | ![Synchronization Playground](img/Synchronization%20Playground.png) | Producer-Consumer, Readers-Writers, Dining Philosophers, Sleeping Barber; lock/semaphore usage in the log. |
| **Deadlock — RAG** | ![Deadlock Analyzer 1](img/Deadlock%20Analyzer1.png) | Resource Allocation Graph: processes, resources, request/assignment edges, cycle detection. |
| **Deadlock — Banker's** | ![Deadlock Analyzer 2](img/Deadlock%20Analyzer2.png) | Banker's Algorithm: Allocation, Max, Available; safe/unsafe and safe sequence with walkthrough. |
| **Memory Management** | ![Memory Management](img/Memory%20Management.png) | First/Best/Worst fit, memory map, fragmentation; "Load Fragmented Demo" and "Compare All". |
| **Virtual Memory — FIFO** | ![Virtual Memory FIFO](img/Virtual%20Memory%20Simulator-%20FIFO.png) | FIFO page replacement: frame table, fault/hit, and FIFO queue (front = next victim) per step. |
| **Virtual Memory — LRU** | ![Virtual Memory LRU](img/Virtual%20Memory%20Simulator-LRU.png) | LRU: step-by-step frames and LRU ordering (least recently used at front) for replacement. |
| **Mini File System** | ![Mini File System](img/Mini%20File%20System.png) | Terminal and file browser: `ls`, `mkdir`, `cd`, `create`, `write`, `cat`, `rm`, `rename`. |
| **Block I/O Analyzer** | ![Block I/O Analyzer](img/block%20analyzer.png) | Compare disk I/O cost for insert/remove at begin/middle/end under Contiguous, Linked, and Indexed allocation. |
| **Block I/O Analyzer (results)** | ![Block I/O Analyzer 2](img/block%20analyzer2.png) | Step-by-step explanations and bar chart comparing reads/writes across the three strategies. |

---

## Project Structure

```
mini OS simulator/
├── CMakeLists.txt
├── README.md
├── img/                    # Screenshots for README
├── include/                # Headers: common, process, scheduler, sync, deadlock, memory, vmem, filesystem
├── src/                    # main.cpp + one folder per module (process, scheduler, ...)
├── web/                    # Next.js web UI (see below)
└── data/                   # virtual_disk.bin (created by Module 7)
```

---

## Modules (Summary)

| # | Module | Key features |
|---|--------|----------------|
| 1 | Process & Thread | Create processes/threads, state transitions (NEW→READY→RUNNING→WAITING/TERMINATED), live table, log |
| 2 | CPU Scheduling | FCFS, SJF, RR, Priority, MLFQ — Gantt chart, avg wait/turnaround/response, compare all |
| 3 | Synchronization | Mutex/semaphore; Producer-Consumer, Readers-Writers, Dining Philosophers, Sleeping Barber |
| 4 | Deadlock | RAG with cycle detection; Banker's Algorithm (Allocation, Max, Available → safe sequence) |
| 5 | Memory Management | Fixed/variable partitions, first/best/worst fit, fragmentation, compaction, memory map |
| 6 | Virtual Memory | Address translation, page replacement (FIFO, LRU, Optimal, Clock), compare all |
| 7 | Mini File System | FAT-like virtual disk; shell: ls, mkdir, cd, create, write, cat, rm, rename; Block I/O Cost Analyzer (Contiguous/Linked/Indexed) |

---

## Using the Modules (Terminal)

After running `./mini_os_sim`, choose a module (1–7). Each module shows a numbered submenu; type the option number and press Enter. Below is how to use each one.

### Module 1 — Process & Thread

**Menu:** Create Process, Add Thread, Transition State, Show Process Table, Show Threads, Run Demo, Back.

- **Quick run:** Option **7** (Run Demo) to auto-create sample processes and see state changes in the log.
- **Manual:** **1** → enter burst, priority, arrival, memory. **5** to see the process table. **3** to change a process state (0=NEW, 1=READY, 2=RUNNING, 3=WAITING, 4=TERMINATED). **2** to add a thread to a process, **6** to list a process’s threads.

### Module 2 — CPU Scheduling

**Menu:** Add process, run FCFS/SJF/RR/Priority/MLFQ, Compare All (custom or sample), Back.

- **Quick run:** **7** (Compare All with sample workload) to run the same workload through all five algorithms and see Gantt charts and comparison table.
- **Custom workload:** **6** (Compare All) → enter number of processes, then for each: arrival, burst, priority. Enter time quantum for RR. All five schedulers run on that input.

### Module 3 — Synchronization

**Menu:** Producer-Consumer, Readers-Writers, Dining Philosophers, Sleeping Barber, Back.

- **Quick run:** **1** (Producer-Consumer) → e.g. 2 producers, 2 consumers, buffer size 3, 10 items. Watch the log (“Producer produced item”, “Consumer consumed”, “acquired lock”, etc.).
- Try **2**, **3**, **4** with small numbers (e.g. 3 philosophers, 2 meals) to follow locks and waits in the log.

### Module 4 — Deadlock

**Menu:** Resource Allocation Graph, Banker’s (manual), Banker’s Demo, Back.

- **RAG:** **1** → add processes and resources (e.g. +P, +R), add request (P→R) and assignment (R→P) edges. **9** (Run Demo) loads a cycle. **8** (Check for Deadlock) shows “DEADLOCK DETECTED” and the cycle. **7** displays the graph.
- **Banker’s:** **3** runs the demo (Allocation, Max, Available → safe/unsafe and safe sequence). **2** for manual input: number of processes and resource types, then Allocation matrix, Max matrix, Available vector.

### Module 5 — Memory Management

**Menu:** Fixed partition / Variable partition, then (in Variable): Allocate First/Best/Worst Fit (1/2/3), Deallocate (4), Compact (5), Reset (6), Back (0). The memory map and table are shown after each action.

- **Quick run:** **2** (Variable Partition) → total memory (e.g. 512). **1** (First Fit) → PID and size (e.g. 1, 64). Repeat with more PIDs/sizes; the map updates each time. **4** (Deallocate) one PID to create a hole (external fragmentation). **5** (Compact) to merge free space.
- Compare **1** First Fit, **2** Best Fit, **3** Worst Fit on the same allocation pattern to see different fragmentation.

### Module 6 — Virtual Memory

**Menu:** Address Translation, Page Replacement, Back.

- **Address Translation:** **1** → set page size, pages, frames; edit page table (page→frame); enter logical address to see physical address or page fault.
- **Page Replacement:** **2** → number of frames (e.g. 3). **6** (Compare All with sample) runs the sample reference string with FIFO, LRU, Optimal, Clock and shows step-by-step frames and comparison. **5** (Compare All) lets you enter a custom space-separated reference string.

### Module 7 — Mini File System

**Prompt:** `minifs:/$` (or `minifs:/path/$`). Type commands; type `help` for the list.

- **Example:** `mkdir docs` → `create hello.txt` → `write hello.txt "Hello"` → `ls` → `cat hello.txt` → `cd docs` → `create notes.txt` → `write notes.txt "Subdir"` → `ls` → `cd ..` → `rename hello.txt greeting.txt` → `rm greeting.txt` → `exit` (back to main menu).
- **Block I/O Analyzer (web only):** In the File System page, open the **Block I/O Analyzer** tab. Set file size (e.g. 100 blocks) and position; choose an operation (insert/remove at beginning, middle, or end). See I/O counts for Contiguous, Linked, and Indexed allocation plus step-by-step explanations and a comparison chart.

- `format` wipes the virtual disk; exit and re-enter Module 7 to use the fresh disk.

---

## Notes

- **Not a real kernel** — all modules run in one user-level process.
- Module 7 creates `virtual_disk.bin` in the working directory and persists it.
- Module 3 uses real `std::thread`s; on multi-core systems you see parallel execution.

For **why C++**, **which features help**, and **what the project teaches**, see [LEARNING.md](LEARNING.md).

---

## Web Version

A full **TypeScript/Next.js** version lives in `web/` with the same seven modules and a visual UI.

**Stack:** Next.js 16 (static export), TypeScript, Tailwind CSS, Recharts.

```bash
cd web
npm install
npm run dev    # http://localhost:3000
npm run build  # → out/ for static deploy
```

Deploy `out/` to Vercel, Netlify, or GitHub Pages (root or `web/` as configured).

| # | Web module | Features |
|---|------------|----------|
| 1 | Process & Thread | Process table, state buttons, thread list, event log |
| 2 | CPU Scheduling | Gantt chart, metrics, Compare All chart |
| 3 | Synchronization | Four classic problems, lock/semaphore log |
| 4 | Deadlock | Interactive RAG, Banker's with walkthrough |
| 5 | Memory Management | Memory map, fit comparison, fragmented demo |
| 6 | Virtual Memory | Step table with queue/stack column, comparison |
| 7 | File System | Terminal + file browser; Block I/O Analyzer tab (Contiguous/Linked/Indexed) |
