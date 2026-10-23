#include "vmem/page_table.h"
#include "vmem/page_replacement.h"
#include "common/display.h"
#include <sstream>
#include <iostream>

static void addressTranslation() {
    Display::printSubHeader("Address Translation");
    int pageSize = Display::readInt("Page size (bytes): ", 1, 65536);
    int numPages = Display::readInt("Number of pages: ", 1, 256);
    int numFrames = Display::readInt("Number of frames: ", 1, 256);

    PageTable pt(numPages, numFrames, pageSize);

    while (true) {
        std::cout << "\n";
        Display::printMenuOption(1, "Map page to frame");
        Display::printMenuOption(2, "Unmap page");
        Display::printMenuOption(3, "Translate logical address");
        Display::printMenuOption(4, "Show page table");
        Display::printMenuOption(0, "Back");

        int ch = Display::readInt("Choice [0-4]: ", 0, 4);
        if (ch == 0) return;

        if (ch == 1) {
            int page = Display::readInt("  Page number: ", 0, numPages - 1);
            int frame = Display::readInt("  Frame number: ", 0, numFrames - 1);
            pt.mapPage(page, frame);
            Display::printSuccess("Mapped page " + std::to_string(page) + " -> frame " + std::to_string(frame));
        }
        else if (ch == 2) {
            int page = Display::readInt("  Page number: ", 0, numPages - 1);
            pt.unmapPage(page);
            Display::printSuccess("Unmapped page " + std::to_string(page));
        }
        else if (ch == 3) {
            int addr = Display::readInt("  Logical address: ", 0, numPages * pageSize - 1);
            pt.translateAndShow(addr);
        }
        else if (ch == 4) {
            pt.display();
        }
    }
}

static std::vector<int> readReferenceString() {
    std::cout << "  Enter reference string (space-separated page numbers, e.g. 7 0 1 2 0 3 0 4 2 3):\n  ";
    std::string line;
    std::getline(std::cin, line);
    std::istringstream iss(line);
    std::vector<int> refs;
    int val;
    while (iss >> val) refs.push_back(val);
    return refs;
}

static void pageReplacementSim() {
    Display::printSubHeader("Page Replacement Simulation");
    int numFrames = Display::readInt("Number of frames: ", 1, 20);

    while (true) {
        std::cout << "\n";
        Display::printMenuOption(1, "Run FIFO");
        Display::printMenuOption(2, "Run LRU");
        Display::printMenuOption(3, "Run Optimal");
        Display::printMenuOption(4, "Run Clock");
        Display::printMenuOption(5, "Compare All");
        Display::printMenuOption(6, "Compare All (sample: 7 0 1 2 0 3 0 4 2 3 0 3 2)");
        Display::printMenuOption(0, "Back");

        int ch = Display::readInt("Choice [0-6]: ", 0, 6);
        if (ch == 0) return;

        std::vector<int> refs;
        if (ch == 6) {
            refs = {7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2};
            Display::printInfo("Using sample reference string: 7 0 1 2 0 3 0 4 2 3 0 3 2");
        } else {
            refs = readReferenceString();
            if (refs.empty()) {
                Display::printError("No reference string provided.");
                continue;
            }
        }

        if (ch == 1) {
            auto r = runFIFO(refs, numFrames);
            printReplacementResult(r);
        }
        else if (ch == 2) {
            auto r = runLRU(refs, numFrames);
            printReplacementResult(r);
        }
        else if (ch == 3) {
            auto r = runOptimal(refs, numFrames);
            printReplacementResult(r);
        }
        else if (ch == 4) {
            auto r = runClock(refs, numFrames);
            printReplacementResult(r);
        }
        else if (ch == 5 || ch == 6) {
            std::vector<ReplacementResult> results;
            auto r1 = runFIFO(refs, numFrames); printReplacementResult(r1); results.push_back(r1);
            auto r2 = runLRU(refs, numFrames); printReplacementResult(r2); results.push_back(r2);
            auto r3 = runOptimal(refs, numFrames); printReplacementResult(r3); results.push_back(r3);
            auto r4 = runClock(refs, numFrames); printReplacementResult(r4); results.push_back(r4);
            printReplacementComparison(results);
        }
    }
}

void runVirtualMemory() {
    Display::printHeader("MODULE 6: VIRTUAL MEMORY SIMULATOR");

    while (true) {
        std::cout << "\n";
        Display::printMenuOption(1, "Address Translation (Page Table)");
        Display::printMenuOption(2, "Page Replacement Algorithms");
        Display::printMenuOption(0, "Back to Main Menu");
        std::cout << "\n";

        int ch = Display::readInt("Choice [0-2]: ", 0, 2);
        if (ch == 0) return;

        if (ch == 1) addressTranslation();
        else if (ch == 2) pageReplacementSim();
    }
}
