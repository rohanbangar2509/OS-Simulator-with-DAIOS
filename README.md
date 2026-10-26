# OS Simulator with DAIOS

An interactive educational Operating Systems laboratory built with **Next.js, TypeScript, React, and Tailwind CSS**, alongside a **C++17 terminal simulator**. Explore classic OS concepts through interactive simulations, visualizations, sample scenarios, and learning guides.

**Live Demo:** https://mini-os-simulator-ten.vercel.app/  
**GitHub Repository:** https://github.com/rohanbangar2509/OS-Simulator-with-DAIOS

> **Note:** This is an educational user-level simulator, not a real operating-system kernel. DAIOS Intelligence analyzes simulated workloads. Its current workload classifications are rule-based, not machine-learning predictions, and it does not collect physical-device telemetry.

## Table of Contents

- [Overview](#overview)
- [Web Application Modules](#web-application-modules)
- [DAIOS Intelligence](#daios-intelligence)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Running the C++ Simulator](#running-the-c-simulator)
- [Project Structure](#project-structure)
- [Deploying to Vercel](#deploying-to-vercel)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)
- [License](#license)

## Overview

This repository contains two related implementations:

1. **Web application (`web/`)** — a visual Next.js application with eight interactive modules.
2. **C++ terminal simulator** — a C++17 command-line implementation of the seven traditional OS modules.

The web application includes shared process workloads for CPU scheduling and DAIOS analysis, interactive controls, charts, tables, and module-specific learning guides.

## Web Application Modules

| # | Module | Features |
|---|---|---|
| 1 | **Process & Thread Simulator** | Process states, process information, thread information, state transitions, and event logs. |
| 2 | **CPU Scheduling Laboratory** | FCFS, SJF, Round Robin, Priority, and MLFQ; Gantt charts; waiting, turnaround, response, utilization, and throughput metrics; algorithm comparison. |
| 3 | **Synchronization Playground** | Producer–Consumer, Readers–Writers, Dining Philosophers, and Sleeping Barber, with explanations of synchronization concepts. |
| 4 | **Deadlock Analyzer** | Resource Allocation Graphs, cycle detection, Banker's Algorithm, and safe-sequence walkthroughs. |
| 5 | **Memory Management** | First Fit, Best Fit, Worst Fit, memory maps, fragmentation, and compaction. |
| 6 | **Virtual Memory Simulator** | Address translation and FIFO, LRU, Optimal, and Clock page-replacement algorithms with step-by-step frame states. |
| 7 | **Mini File System** | Simulated FAT-style file system, terminal-like commands, directory browsing, and a Block I/O Cost Analyzer for contiguous, linked, and indexed allocation. |
| 8 | **DAIOS Intelligence Layer** | Simulated workload analysis, scheduling-policy comparison, workload observations, rule-based classification, recommendations, CPU timeline metrics, telemetry history, and CSV export. |

### Screenshots

The screenshots used in this README are stored in the `img/` directory.

| Screenshot | Description |
|---|---|
| ![CPU Scheduling](img/cpu%20scheduling.png) | CPU scheduling and algorithm comparison |
| ![Synchronization Playground](img/Synchronization%20Playground.png) | Synchronization scenarios |
| ![Resource Allocation Graph](img/Deadlock%20Analyzer1.png) | Deadlock analysis using a resource graph |
| ![Banker's Algorithm](img/Deadlock%20Analyzer2.png) | Banker's safety algorithm |
| ![Memory Management](img/Memory%20Management.png) | Memory allocation and fragmentation |
| ![Virtual Memory FIFO](img/Virtual%20Memory%20Simulator-%20FIFO.png) | FIFO page replacement |
| ![Virtual Memory LRU](img/Virtual%20Memory%20Simulator-LRU.png) | LRU page replacement |
| ![Mini File System](img/Mini%20File%20System.png) | File system interface |
| ![Block I/O Analyzer](img/block%20analyzer.png) | Block I/O cost comparison |

## DAIOS Intelligence

**DAIOS stands for Data-Aware Operating System** in this prototype. The Intelligence module analyzes the process workload configured in the CPU Scheduling Laboratory and compares scheduling policies against a user-selected objective.

### Current capabilities

- Analyze the shared simulated process workload.
- Compare FCFS, SJF, Round Robin, Priority, and MLFQ.
- Select an objective: minimize average waiting time, response time, or turnaround time, or maximize throughput.
- Display scheduling metrics and CPU timeline analysis.
- Calculate CPU busy time, idle time, elapsed simulation time, and simulated CPU utilization from Gantt chart segments.
- Display workload observations and provisional rule-based workload classifications.
- Recommend a scheduling policy based on the selected objective and simulated policy comparison.
- Save simulated telemetry snapshots in browser local storage.
- Export captured telemetry history to CSV.
- Retain per-policy timeline summaries with captured snapshots.

### Understanding CPU timeline metrics

- **CPU busy time:** Total duration of process-execution segments.
- **CPU idle time:** Total duration of idle segments when no process is executing.
- **Elapsed simulation time:** Total duration represented by the Gantt timeline, including idle intervals.
- **Simulated CPU utilization:** `busy time / elapsed simulation time × 100`.
- **Policy recommendation:** The policy that performs best for the selected objective among the evaluated algorithms for the current simulated workload.

**Interpretation:** These metrics describe simulated operations, not the physical CPU or operating system running the browser. Current workload classifications use rules; they should not be interpreted as ML predictions.

## Technology Stack

### Web Application

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Recharts
- Lucide React

### C++ Terminal Simulator

- C++17
- CMake 3.16+
- C++ standard library
- C++ threads and synchronization primitives for concurrency demonstrations

## Getting Started

### Prerequisites

Install Node.js and npm versions compatible with Next.js 16.

### Install Dependencies

From the repository root:

```bash
cd web
npm ci
```

### Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build and Test Production Output

```bash
npm run build
npm run start
```

Open `http://localhost:3000` to test locally.

The current `web/next.config.ts` sets `output: "export"`, which generates static site files in `web/out/` during the production build. The project also defines a `start` script in `web/package.json`; use the deployment configuration appropriate for the selected hosting mode.

## Running the C++ Simulator

### Prerequisites

- C++17-compatible compiler
- CMake 3.16 or newer
- Platform support for the thread library used by CMake

### Build

From the repository root:

```bash
cmake -S . -B build
cmake --build build
```

### Run on Linux or macOS

```bash
./build/mini_os_sim
```

### Run on Windows

For a typical Visual Studio CMake generator:

```powershell
.\build\Debug\mini_os_sim.exe
```

For single-configuration generators such as Ninja or MinGW, the executable may instead be located at `build/mini_os_sim.exe`.

Choose a module from the terminal menu and follow the numbered prompts. The C++ terminal version includes the seven traditional OS modules; DAIOS Intelligence is part of the web application.

## Project Structure

```text
OS-Simulator-with-DAIOS/
├── CMakeLists.txt
├── README.md
├── LEARNING.md
├── LICENSE
├── include/                 # C++ header files
├── src/                     # C++ terminal simulator
├── img/                     # README screenshots
└── web/
    ├── package.json
    ├── package-lock.json
    ├── next.config.ts
    └── src/
        ├── app/              # Eight application routes
        ├── components/       # Sidebar and learning guides
        └── lib/              # OS simulation logic and telemetry
```

## Deploying to Vercel

The Next.js application lives in the **`web/` directory**, not at the root of the repository.

### Recommended configuration

1. Open the Vercel project associated with `mini-os-simulator-ten.vercel.app`.
2. Go to **Settings → Build and Deployment**.
3. Set **Root Directory** to `web`.
4. Confirm the connected Git repository is `rohanbangar2509/OS-Simulator-with-DAIOS`.
5. Confirm the Production Branch is `main`, unless you intentionally use another branch.
6. Keep the Framework Preset as **Next.js** when using Vercel's Next.js integration. Confirm the build command and output settings match the project's `output: "export"` configuration.
7. Deploy the latest commit and inspect its build logs.
8. Test the homepage and all eight routes, especially `/daios`.

For a generic static-site deployment instead of Vercel's Next.js integration, the static output directory is `out` relative to the `web` project root.

### If the live site still shows the old version

Check the following in order:

- **Repository:** Verify that Vercel is connected to `rohanbangar2509/OS-Simulator-with-DAIOS`, not an older repository.
- **Production Branch:** Verify that Vercel deploys the branch where the updated code is committed.
- **Deployment Commit:** In **Deployments**, compare the Production deployment's commit SHA with the latest GitHub commit.
- **Root Directory:** Confirm it is `web`.
- **Build Logs:** Confirm the intended commit builds successfully.
- **Domain Assignment:** Confirm `mini-os-simulator-ten.vercel.app` is assigned to the project you are updating.
- **Browser Cache:** After a successful deployment, try a private window or hard-refresh the page.

If the current Vercel project is connected to an older repository, reconnect it to this repository or import the correct repository as a new Vercel project. Confirm the domain assignment before deleting or replacing any project.

## Troubleshooting

### Dependency installation fails

Run `npm ci` from `web/` and ensure `package-lock.json` is committed.

### Vercel continues to show the old UI

Check the repository, production branch, root directory, commit SHA, build logs, and domain assignment. Running a local build does not update the deployed website; the changes must be committed and deployed.

### Port 3000 is already in use

Stop the process using the port or start the development server on another available port.

### Telemetry history differs between browsers

DAIOS snapshots are stored in browser local storage. They are specific to a browser and origin and are not stored in a shared server database.

## Limitations

- This is an educational simulator, not a real kernel or hardware-level operating system.
- The web application simulates OS concepts in the browser.
- DAIOS telemetry is simulation-only and stored in browser local storage.
- The current workload classification is rule-based, not a trained ML classifier.
- CSV export is available for captured simulated telemetry.
- The C++ terminal simulator contains seven traditional OS modules; the web application adds DAIOS Intelligence as the eighth module.

## License

This project is distributed under the [MIT License](LICENSE).
