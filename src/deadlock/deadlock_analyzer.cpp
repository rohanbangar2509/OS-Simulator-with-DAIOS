#include "deadlock/resource_graph.h"
#include "deadlock/bankers.h"
#include "common/display.h"
#include <iostream>
#include <sstream>

static void ragInteractive() {
    Display::printSubHeader("Resource Allocation Graph - Interactive");
    ResourceGraph graph;

    while (true) {
        std::cout << "\n";
        Display::printMenuOption(1, "Add Process");
        Display::printMenuOption(2, "Add Resource");
        Display::printMenuOption(3, "Add Assignment (Resource -> Process)");
        Display::printMenuOption(4, "Add Request (Process -> Resource)");
        Display::printMenuOption(5, "Remove Assignment");
        Display::printMenuOption(6, "Remove Request");
        Display::printMenuOption(7, "Display Graph");
        Display::printMenuOption(8, "Check for Deadlock (cycle)");
        Display::printMenuOption(9, "Run Demo");
        Display::printMenuOption(0, "Back");
        std::cout << "\n";

        int ch = Display::readInt("Choice [0-9]: ", 0, 9);
        if (ch == 0) return;

        if (ch == 1) {
            int pid = Display::readInt("  Process ID: ", 0, 100);
            graph.addProcess(pid);
            Display::printSuccess("Added P" + std::to_string(pid));
        }
        else if (ch == 2) {
            int rid = Display::readInt("  Resource ID: ", 0, 100);
            graph.addResource(rid);
            Display::printSuccess("Added R" + std::to_string(rid));
        }
        else if (ch == 3) {
            int rid = Display::readInt("  Resource ID: ", 0, 100);
            int pid = Display::readInt("  Assigned to Process ID: ", 0, 100);
            graph.addAssignment(rid, pid);
            Display::printSuccess("R" + std::to_string(rid) + " -> P" + std::to_string(pid));
        }
        else if (ch == 4) {
            int pid = Display::readInt("  Process ID: ", 0, 100);
            int rid = Display::readInt("  Requests Resource ID: ", 0, 100);
            graph.addRequest(pid, rid);
            Display::printSuccess("P" + std::to_string(pid) + " -> R" + std::to_string(rid));
        }
        else if (ch == 5) {
            int rid = Display::readInt("  Resource ID to free: ", 0, 100);
            graph.removeAssignment(rid);
            Display::printSuccess("Removed assignment for R" + std::to_string(rid));
        }
        else if (ch == 6) {
            int pid = Display::readInt("  Process ID: ", 0, 100);
            int rid = Display::readInt("  Resource ID: ", 0, 100);
            graph.removeRequest(pid, rid);
            Display::printSuccess("Removed request");
        }
        else if (ch == 7) {
            graph.display();
        }
        else if (ch == 8) {
            std::vector<int> cycle;
            if (graph.detectCycle(cycle)) {
                std::cout << Display::Color::RED << Display::Color::BOLD
                          << "\n  DEADLOCK DETECTED!\n" << Display::Color::RESET;
                std::cout << "  Cycle: ";
                for (size_t i = 0; i < cycle.size(); i++) {
                    std::cout << "P" << cycle[i];
                    if (i + 1 < cycle.size()) std::cout << " -> ";
                }
                std::cout << "\n";
            } else {
                Display::printSuccess("No deadlock detected. System is safe.");
            }
        }
        else if (ch == 9) {
            graph = ResourceGraph();
            for (int i = 0; i < 3; i++) graph.addProcess(i);
            for (int i = 0; i < 3; i++) graph.addResource(i);
            graph.addAssignment(0, 0);  // R0 held by P0
            graph.addAssignment(1, 1);  // R1 held by P1
            graph.addAssignment(2, 2);  // R2 held by P2
            graph.addRequest(0, 1);     // P0 wants R1
            graph.addRequest(1, 2);     // P1 wants R2
            graph.addRequest(2, 0);     // P2 wants R0 -> cycle!

            graph.display();
            std::vector<int> cycle;
            if (graph.detectCycle(cycle)) {
                std::cout << Display::Color::RED << Display::Color::BOLD
                          << "\n  DEADLOCK DETECTED!\n" << Display::Color::RESET;
                std::cout << "  Cycle: ";
                for (size_t i = 0; i < cycle.size(); i++) {
                    std::cout << "P" << cycle[i];
                    if (i + 1 < cycle.size()) std::cout << " -> ";
                }
                std::cout << "\n";
            }
        }
    }
}

static void bankersInteractive() {
    Display::printSubHeader("Banker's Algorithm");

    int n = Display::readInt("Number of processes: ", 1, 20);
    int m = Display::readInt("Number of resource types: ", 1, 10);

    BankersAlgorithm banker(n, m);

    std::cout << "\nEnter Allocation matrix (" << n << "x" << m << "):\n";
    for (int i = 0; i < n; i++) {
        std::cout << "  P" << i << ": ";
        std::vector<int> row(m);
        for (int j = 0; j < m; j++) std::cin >> row[j];
        banker.setAllocation(i, row);
    }
    std::cin.ignore(10000, '\n');

    std::cout << "Enter Max matrix (" << n << "x" << m << "):\n";
    for (int i = 0; i < n; i++) {
        std::cout << "  P" << i << ": ";
        std::vector<int> row(m);
        for (int j = 0; j < m; j++) std::cin >> row[j];
        banker.setMax(i, row);
    }
    std::cin.ignore(10000, '\n');

    std::cout << "Enter Available vector (" << m << " values): ";
    std::vector<int> avail(m);
    for (int j = 0; j < m; j++) std::cin >> avail[j];
    std::cin.ignore(10000, '\n');

    banker.setAvailable(avail);
    std::cout << "\n";
    banker.displayMatrices();

    std::vector<int> safeSeq;
    if (banker.isSafe(safeSeq)) {
        std::cout << Display::Color::GREEN << Display::Color::BOLD
                  << "\n  System is in a SAFE state.\n" << Display::Color::RESET;
        std::cout << "  Safe sequence: ";
        for (size_t i = 0; i < safeSeq.size(); i++) {
            std::cout << "P" << safeSeq[i];
            if (i + 1 < safeSeq.size()) std::cout << " -> ";
        }
        std::cout << "\n";
    } else {
        std::cout << Display::Color::RED << Display::Color::BOLD
                  << "\n  System is in an UNSAFE state. Deadlock may occur!\n"
                  << Display::Color::RESET;
    }
}

static void bankersDemo() {
    Display::printSubHeader("Banker's Algorithm - Demo");
    BankersAlgorithm banker(5, 3);

    banker.setAllocation(0, {0, 1, 0});
    banker.setAllocation(1, {2, 0, 0});
    banker.setAllocation(2, {3, 0, 2});
    banker.setAllocation(3, {2, 1, 1});
    banker.setAllocation(4, {0, 0, 2});

    banker.setMax(0, {7, 5, 3});
    banker.setMax(1, {3, 2, 2});
    banker.setMax(2, {9, 0, 2});
    banker.setMax(3, {2, 2, 2});
    banker.setMax(4, {4, 3, 3});

    banker.setAvailable({3, 3, 2});

    banker.displayMatrices();

    std::vector<int> safeSeq;
    if (banker.isSafe(safeSeq)) {
        std::cout << Display::Color::GREEN << Display::Color::BOLD
                  << "\n  System is in a SAFE state.\n" << Display::Color::RESET;
        std::cout << "  Safe sequence: ";
        for (size_t i = 0; i < safeSeq.size(); i++) {
            std::cout << "P" << safeSeq[i];
            if (i + 1 < safeSeq.size()) std::cout << " -> ";
        }
        std::cout << "\n";
    } else {
        std::cout << Display::Color::RED << Display::Color::BOLD
                  << "\n  System is in an UNSAFE state!\n" << Display::Color::RESET;
    }
}

void runDeadlockAnalyzer() {
    Display::printHeader("MODULE 4: DEADLOCK ANALYZER");

    while (true) {
        std::cout << "\n";
        Display::printMenuOption(1, "Resource Allocation Graph (Interactive)");
        Display::printMenuOption(2, "Banker's Algorithm (Manual Input)");
        Display::printMenuOption(3, "Banker's Algorithm (Demo)");
        Display::printMenuOption(0, "Back to Main Menu");
        std::cout << "\n";

        int ch = Display::readInt("Choice [0-3]: ", 0, 3);
        if (ch == 0) return;

        if (ch == 1) ragInteractive();
        else if (ch == 2) bankersInteractive();
        else if (ch == 3) bankersDemo();
    }
}
