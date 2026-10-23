#include "memory/memory_manager.h"
#include "common/display.h"
#include <iostream>

static void fixedPartitionDemo() {
    Display::printSubHeader("Fixed Partition Allocation");
    int totalMem = Display::readInt("Total memory size (KB): ", 64, 65536);
    int numParts = Display::readInt("Number of partitions: ", 1, 20);

    std::vector<int> partSizes;
    int remaining = totalMem;
    for (int i = 0; i < numParts; i++) {
        std::cout << "  Partition " << (i + 1) << " size (remaining=" << remaining << " KB): ";
        int sz;
        std::cin >> sz;
        std::cin.ignore(10000, '\n');
        if (sz > remaining) sz = remaining;
        partSizes.push_back(sz);
        remaining -= sz;
    }

    std::vector<int> partOwner(numParts, -1);

    auto displayFixed = [&]() {
        std::cout << "\n[";
        for (int i = 0; i < numParts; i++) {
            std::string label = (partOwner[i] == -1) ? "FREE" : ("P" + std::to_string(partOwner[i]));
            std::cout << " " << label << "(" << partSizes[i] << "KB) |";
        }
        std::cout << "\n\n";

        int internalFrag = 0;
        std::vector<std::string> headers = {"Partition", "Size", "Status", "PID", "Int.Frag"};
        std::vector<std::vector<std::string>> rows;
        for (int i = 0; i < numParts; i++) {
            int frag = 0;
            if (partOwner[i] != -1) frag = partSizes[i]; // simplified
            rows.push_back({
                std::to_string(i + 1),
                std::to_string(partSizes[i]) + " KB",
                partOwner[i] == -1 ? "FREE" : "USED",
                partOwner[i] == -1 ? "-" : ("P" + std::to_string(partOwner[i])),
                std::to_string(frag) + " KB"
            });
            internalFrag += frag;
        }
        Display::printTable(headers, rows);
    };

    while (true) {
        displayFixed();
        Display::printMenuOption(1, "Allocate process to partition");
        Display::printMenuOption(2, "Deallocate partition");
        Display::printMenuOption(0, "Back");

        int ch = Display::readInt("Choice [0-2]: ", 0, 2);
        if (ch == 0) return;

        if (ch == 1) {
            int pid = Display::readInt("  Process ID: ", 0, 1000);
            int psize = Display::readInt("  Process size (KB): ", 1, totalMem);
            bool placed = false;
            for (int i = 0; i < numParts; i++) {
                if (partOwner[i] == -1 && partSizes[i] >= psize) {
                    partOwner[i] = pid;
                    Display::printSuccess("P" + std::to_string(pid) + " placed in partition "
                        + std::to_string(i + 1) + " (internal frag=" + std::to_string(partSizes[i] - psize) + " KB)");
                    placed = true;
                    break;
                }
            }
            if (!placed) Display::printError("No suitable partition found.");
        }
        else if (ch == 2) {
            int part = Display::readInt("  Partition number: ", 1, numParts);
            partOwner[part - 1] = -1;
            Display::printSuccess("Partition " + std::to_string(part) + " freed.");
        }
    }
}

static void variablePartitionSim() {
    Display::printSubHeader("Variable Partition Allocation");
    int totalMem = Display::readInt("Total memory size (KB): ", 64, 65536);
    MemoryManager mm(totalMem);

    while (true) {
        mm.displayMemoryMap();
        std::cout << "\n";
        Display::printMenuOption(1, "Allocate (First Fit)");
        Display::printMenuOption(2, "Allocate (Best Fit)");
        Display::printMenuOption(3, "Allocate (Worst Fit)");
        Display::printMenuOption(4, "Deallocate Process");
        Display::printMenuOption(5, "Compact Memory");
        Display::printMenuOption(6, "Reset Memory");
        Display::printMenuOption(0, "Back");

        int ch = Display::readInt("Choice [0-6]: ", 0, 6);
        if (ch == 0) return;

        if (ch >= 1 && ch <= 3) {
            int pid = Display::readInt("  Process ID: ", 0, 1000);
            int size = Display::readInt("  Size (KB): ", 1, totalMem);
            bool ok = false;
            if (ch == 1) ok = mm.allocateFirstFit(pid, size);
            else if (ch == 2) ok = mm.allocateBestFit(pid, size);
            else ok = mm.allocateWorstFit(pid, size);
            if (ok) Display::printSuccess("Allocated P" + std::to_string(pid) + " (" + std::to_string(size) + " KB)");
            else Display::printError("Allocation failed. Not enough contiguous memory.");
        }
        else if (ch == 4) {
            int pid = Display::readInt("  Process ID to free: ", 0, 1000);
            mm.deallocate(pid);
            Display::printSuccess("Deallocated P" + std::to_string(pid));
        }
        else if (ch == 5) {
            mm.compact();
            Display::printSuccess("Memory compacted.");
        }
        else if (ch == 6) {
            mm.reset();
            Display::printSuccess("Memory reset.");
        }
    }
}

void runMemoryManager() {
    Display::printHeader("MODULE 5: MEMORY MANAGEMENT SIMULATOR");

    while (true) {
        std::cout << "\n";
        Display::printMenuOption(1, "Fixed Partition Allocation");
        Display::printMenuOption(2, "Variable Partition (First/Best/Worst Fit)");
        Display::printMenuOption(0, "Back to Main Menu");
        std::cout << "\n";

        int ch = Display::readInt("Choice [0-2]: ", 0, 2);
        if (ch == 0) return;

        if (ch == 1) fixedPartitionDemo();
        else if (ch == 2) variablePartitionSim();
    }
}
