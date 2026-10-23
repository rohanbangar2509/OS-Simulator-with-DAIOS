#include "scheduler/fcfs.h"
#include "scheduler/sjf.h"
#include "scheduler/round_robin.h"
#include "scheduler/priority.h"
#include "scheduler/mlfq.h"
#include "common/display.h"
#include <iostream>
#include <sstream>

static std::vector<ProcessControlBlock> getWorkload() {
    std::vector<ProcessControlBlock> procs;
    Display::printSubHeader("Define Workload");
    int n = Display::readInt("Number of processes [1-20]: ", 1, 20);
    for (int i = 0; i < n; i++) {
        std::cout << Display::Color::CYAN << "\n  Process " << (i+1) << ":\n" << Display::Color::RESET;
        ProcessControlBlock p;
        p.pid = i + 1;
        p.arrival_time = Display::readInt("    Arrival time: ", 0, 10000);
        p.burst_time = Display::readInt("    Burst time: ", 1, 10000);
        p.priority = Display::readInt("    Priority (lower=higher): ", 0, 100);
        p.remaining_burst = p.burst_time;
        procs.push_back(p);
    }
    return procs;
}

static std::vector<ProcessControlBlock> sampleWorkload() {
    std::vector<ProcessControlBlock> procs;
    int pids[] = {1,2,3,4,5};
    int arr[]  = {0,1,2,3,4};
    int bur[]  = {6,8,7,3,4};
    int pri[]  = {2,1,4,3,5};
    for (int i = 0; i < 5; i++) {
        ProcessControlBlock p;
        p.pid = pids[i];
        p.arrival_time = arr[i];
        p.burst_time = bur[i];
        p.remaining_burst = bur[i];
        p.priority = pri[i];
        procs.push_back(p);
    }
    return procs;
}

void runSchedulerLab() {
    Display::printHeader("MODULE 2: CPU SCHEDULING LABORATORY");

    while (true) {
        std::cout << "\n";
        Display::printMenuOption(1, "Run FCFS");
        Display::printMenuOption(2, "Run SJF (Non-Preemptive)");
        Display::printMenuOption(3, "Run Round Robin");
        Display::printMenuOption(4, "Run Priority (Non-Preemptive)");
        Display::printMenuOption(5, "Run MLFQ");
        Display::printMenuOption(6, "Compare All Algorithms");
        Display::printMenuOption(7, "Compare All (sample workload)");
        Display::printMenuOption(0, "Back to Main Menu");
        std::cout << "\n";

        int ch = Display::readInt("Choice [0-7]: ", 0, 7);
        if (ch == 0) return;

        std::vector<ProcessControlBlock> procs;
        if (ch == 7) {
            procs = sampleWorkload();
            Display::printInfo("Using sample workload: 5 processes");
        } else {
            procs = getWorkload();
        }

        if (ch == 1) {
            runFCFS(procs);
        } else if (ch == 2) {
            runSJF(procs);
        } else if (ch == 3) {
            int q = Display::readInt("Time quantum: ", 1, 100);
            runRoundRobin(procs, q);
        } else if (ch == 4) {
            runPriority(procs);
        } else if (ch == 5) {
            runMLFQ(procs);
        } else if (ch == 6 || ch == 7) {
            int q = 4;
            if (ch == 6) q = Display::readInt("RR time quantum: ", 1, 100);
            std::vector<ScheduleResult> results;
            results.push_back(runFCFS(procs));
            results.push_back(runSJF(procs));
            results.push_back(runRoundRobin(procs, q));
            results.push_back(runPriority(procs));
            results.push_back(runMLFQ(procs));
            printComparison(results);
        }
    }
}
