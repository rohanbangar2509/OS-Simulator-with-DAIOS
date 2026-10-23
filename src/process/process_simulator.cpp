#include "process/process_manager.h"
#include "common/display.h"
#include <iostream>

static void interactiveDemo(ProcessManager& pm) {
    while (true) {
        std::cout << "\n";
        Display::printSubHeader("Process & Thread Simulator");
        Display::printMenuOption(1, "Create Process");
        Display::printMenuOption(2, "Add Thread to Process");
        Display::printMenuOption(3, "Transition Process State");
        Display::printMenuOption(4, "Transition Thread State");
        Display::printMenuOption(5, "Show Process Table");
        Display::printMenuOption(6, "Show Threads of a Process");
        Display::printMenuOption(7, "Run Demo (auto-create sample processes)");
        Display::printMenuOption(0, "Back to Main Menu");
        std::cout << "\n";

        int ch = Display::readInt("Choice [0-7]: ", 0, 7);
        if (ch == 0) return;

        if (ch == 1) {
            int burst = Display::readInt("  Burst time: ", 1, 1000);
            int pri   = Display::readInt("  Priority (lower = higher): ", 0, 100);
            int arr   = Display::readInt("  Arrival time: ", 0, 10000);
            int mem   = Display::readInt("  Memory requirement (KB): ", 1, 65536);
            int pid = pm.createProcess(burst, pri, arr, mem);
            Display::printSuccess("Created process P" + std::to_string(pid));
        }
        else if (ch == 2) {
            pm.displayProcessTable();
            int pid   = Display::readInt("  Process PID: ", 0, 10000);
            int burst = Display::readInt("  Thread burst time: ", 1, 1000);
            int tid = pm.addThread(pid, burst);
            if (tid >= 0)
                Display::printSuccess("Added thread T" + std::to_string(tid) + " to P" + std::to_string(pid));
            else
                Display::printError("Process not found.");
        }
        else if (ch == 3) {
            pm.displayProcessTable();
            int pid = Display::readInt("  Process PID: ", 0, 10000);
            std::cout << "  States: 0=NEW 1=READY 2=RUNNING 3=WAITING 4=TERMINATED\n";
            int st = Display::readInt("  New state: ", 0, 4);
            pm.transitionProcess(pid, static_cast<ProcessState>(st));
            Display::printSuccess("Transition done.");
        }
        else if (ch == 4) {
            int pid = Display::readInt("  Process PID: ", 0, 10000);
            pm.displayThreadTable(pid);
            int tid = Display::readInt("  Thread TID: ", 0, 10000);
            std::cout << "  States: 0=NEW 1=READY 2=RUNNING 3=WAITING 4=TERMINATED\n";
            int st = Display::readInt("  New state: ", 0, 4);
            pm.transitionThread(pid, tid, static_cast<ProcessState>(st));
            Display::printSuccess("Transition done.");
        }
        else if (ch == 5) {
            pm.displayProcessTable();
        }
        else if (ch == 6) {
            int pid = Display::readInt("  Process PID: ", 0, 10000);
            pm.displayThreadTable(pid);
        }
        else if (ch == 7) {
            pm.clear();
            Logger::instance().reset();
            Display::printInfo("Running automated demo...\n");

            int p1 = pm.createProcess(10, 1, 0, 256);
            int p2 = pm.createProcess(5, 2, 1, 128);
            int p3 = pm.createProcess(8, 3, 2, 512);

            pm.addThread(p1, 4);
            pm.addThread(p1, 6);
            pm.addThread(p2, 5);

            pm.transitionProcess(p1, ProcessState::READY);
            pm.transitionProcess(p2, ProcessState::READY);
            pm.transitionProcess(p3, ProcessState::READY);

            pm.transitionProcess(p1, ProcessState::RUNNING);
            pm.transitionThread(p1, 1, ProcessState::READY);
            pm.transitionThread(p1, 1, ProcessState::RUNNING);
            pm.transitionThread(p1, 2, ProcessState::READY);

            pm.transitionProcess(p1, ProcessState::WAITING);
            pm.transitionThread(p1, 1, ProcessState::WAITING);

            pm.transitionProcess(p2, ProcessState::RUNNING);

            pm.transitionProcess(p2, ProcessState::TERMINATED);

            pm.transitionProcess(p1, ProcessState::READY);
            pm.transitionProcess(p1, ProcessState::RUNNING);
            pm.transitionProcess(p1, ProcessState::TERMINATED);

            pm.transitionProcess(p3, ProcessState::RUNNING);
            pm.transitionProcess(p3, ProcessState::TERMINATED);

            std::cout << "\n";
            Display::printSubHeader("Final Process Table");
            pm.displayProcessTable();
            Display::printSubHeader("Threads of P" + std::to_string(p1));
            pm.displayThreadTable(p1);
        }
    }
}

void runProcessSimulator() {
    ProcessManager pm;
    Logger::instance().reset();
    Display::printHeader("MODULE 1: PROCESS & THREAD SIMULATOR");
    interactiveDemo(pm);
}
