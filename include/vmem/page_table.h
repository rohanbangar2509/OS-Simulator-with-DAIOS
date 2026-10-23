#pragma once
#include <vector>
#include <string>
#include <iostream>
#include <iomanip>
#include "common/display.h"

struct PageTableEntry {
    int frame = -1;
    bool valid = false;
};

class PageTable {
public:
    PageTable(int numPages, int numFrames, int pageSize)
        : numPages_(numPages), numFrames_(numFrames), pageSize_(pageSize),
          entries_(numPages) {}

    void mapPage(int page, int frame) {
        if (page >= 0 && page < numPages_) {
            entries_[page].frame = frame;
            entries_[page].valid = true;
        }
    }

    void unmapPage(int page) {
        if (page >= 0 && page < numPages_) {
            entries_[page].frame = -1;
            entries_[page].valid = false;
        }
    }

    int translate(int logicalAddr) const {
        int page = logicalAddr / pageSize_;
        int offset = logicalAddr % pageSize_;
        if (page < 0 || page >= numPages_ || !entries_[page].valid)
            return -1; // page fault
        return entries_[page].frame * pageSize_ + offset;
    }

    void display() const {
        Display::printSubHeader("Page Table");
        std::vector<std::string> headers = {"Page", "Frame", "Valid"};
        std::vector<std::vector<std::string>> rows;
        for (int i = 0; i < numPages_; i++) {
            rows.push_back({
                std::to_string(i),
                entries_[i].valid ? std::to_string(entries_[i].frame) : "-",
                entries_[i].valid ? "Y" : "N"
            });
        }
        Display::printTable(headers, rows);
    }

    void translateAndShow(int logicalAddr) const {
        int page = logicalAddr / pageSize_;
        int offset = logicalAddr % pageSize_;
        int phys = translate(logicalAddr);
        std::cout << "  Logical address " << logicalAddr
                  << " -> Page " << page << ", Offset " << offset;
        if (phys >= 0)
            std::cout << " -> Physical address " << phys
                      << " (Frame " << entries_[page].frame << ")\n";
        else
            std::cout << " -> " << Display::Color::RED << "PAGE FAULT" << Display::Color::RESET << "\n";
    }

    int numPages() const { return numPages_; }
    int numFrames() const { return numFrames_; }
    int pageSize() const { return pageSize_; }

private:
    int numPages_, numFrames_, pageSize_;
    std::vector<PageTableEntry> entries_;
};
