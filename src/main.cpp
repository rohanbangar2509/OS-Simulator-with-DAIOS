#include "common/display.h"

void runProcessSimulator();
void runSchedulerLab();
void runSyncPlayground();
void runDeadlockAnalyzer();
void runMemoryManager();
void runVirtualMemory();
void runFileSystem();

int main() {
    while (true) {
        Display::clearScreen();
        std::cout << Display::Color::CYAN << Display::Color::BOLD;
        std::cout << R"(
  +====================================================+
  |         MINI OPERATING SYSTEM SIMULATOR             |
  +====================================================+
)" << Display::Color::RESET;

        Display::printMenuOption(1, "Process & Thread Simulator");
        Display::printMenuOption(2, "CPU Scheduling Laboratory");
        Display::printMenuOption(3, "Synchronization Playground");
        Display::printMenuOption(4, "Deadlock Analyzer");
        Display::printMenuOption(5, "Memory Management Simulator");
        Display::printMenuOption(6, "Virtual Memory Simulator");
        Display::printMenuOption(7, "Mini File System");
        Display::printMenuOption(0, "Exit");
        std::cout << "\n";

        int choice = Display::readInt("Select module [0-7]: ", 0, 7);

        switch (choice) {
            case 1: runProcessSimulator(); break;
            case 2: runSchedulerLab(); break;
            case 3: runSyncPlayground(); break;
            case 4: runDeadlockAnalyzer(); break;
            case 5: runMemoryManager(); break;
            case 6: runVirtualMemory(); break;
            case 7: runFileSystem(); break;
            case 0:
                Display::printSuccess("Goodbye!");
                return 0;
        }
    }
}
