#pragma once
#include <vector>
#include <string>
#include <algorithm>
#include <iostream>
#include <iomanip>
#include "memory/memory_block.h"
#include "common/display.h"

class MemoryManager {
public:
    explicit MemoryManager(int totalSize) : totalSize_(totalSize) {
        blocks_.push_back({0, totalSize, -1});
    }

    bool allocateFirstFit(int pid, int size) {
        for (size_t i = 0; i < blocks_.size(); i++) {
            if (blocks_[i].isFree() && blocks_[i].size >= size) {
                splitAndAllocate(i, pid, size);
                return true;
            }
        }
        return false;
    }

    bool allocateBestFit(int pid, int size) {
        int bestIdx = -1;
        int bestSize = totalSize_ + 1;
        for (size_t i = 0; i < blocks_.size(); i++) {
            if (blocks_[i].isFree() && blocks_[i].size >= size && blocks_[i].size < bestSize) {
                bestSize = blocks_[i].size;
                bestIdx = (int)i;
            }
        }
        if (bestIdx >= 0) {
            splitAndAllocate(bestIdx, pid, size);
            return true;
        }
        return false;
    }

    bool allocateWorstFit(int pid, int size) {
        int worstIdx = -1;
        int worstSize = -1;
        for (size_t i = 0; i < blocks_.size(); i++) {
            if (blocks_[i].isFree() && blocks_[i].size >= size && blocks_[i].size > worstSize) {
                worstSize = blocks_[i].size;
                worstIdx = (int)i;
            }
        }
        if (worstIdx >= 0) {
            splitAndAllocate(worstIdx, pid, size);
            return true;
        }
        return false;
    }

    void deallocate(int pid) {
        for (auto& b : blocks_)
            if (b.pid == pid) b.pid = -1;
        mergeFreeBlocks();
    }

    void compact() {
        std::vector<MemoryBlock> compacted;
        int offset = 0;
        for (auto& b : blocks_) {
            if (!b.isFree()) {
                compacted.push_back({offset, b.size, b.pid});
                offset += b.size;
            }
        }
        if (offset < totalSize_)
            compacted.push_back({offset, totalSize_ - offset, -1});
        blocks_ = compacted;
    }

    int externalFragmentation() const {
        int total = 0;
        int maxFree = 0;
        for (auto& b : blocks_) {
            if (b.isFree()) {
                total += b.size;
                maxFree = std::max(maxFree, b.size);
            }
        }
        return total - maxFree;
    }

    int totalFree() const {
        int total = 0;
        for (auto& b : blocks_)
            if (b.isFree()) total += b.size;
        return total;
    }

    void displayMemoryMap() const {
        Display::printSubHeader("Memory Map");
        int barWidth = 60;

        std::cout << "[";
        for (auto& b : blocks_) {
            int w = std::max(1, (int)((double)b.size / totalSize_ * barWidth));
            std::string label;
            if (b.isFree()) {
                label = "FREE";
                std::cout << Display::Color::DIM;
            } else {
                label = "P" + std::to_string(b.pid);
                std::cout << Display::Color::GREEN;
            }
            int pad = (w - (int)label.size()) / 2;
            if (pad < 0) pad = 0;
            std::cout << std::string(pad, ' ') << label
                      << std::string(std::max(0, w - pad - (int)label.size()), ' ');
            std::cout << Display::Color::RESET << "|";
        }
        std::cout << "\n";

        std::cout << "0";
        for (auto& b : blocks_) {
            int w = std::max(1, (int)((double)b.size / totalSize_ * barWidth));
            std::string ts = std::to_string(b.start + b.size);
            std::cout << std::string(std::max(0, w + 1 - (int)ts.size()), ' ') << ts;
        }
        std::cout << "\n";

        std::vector<std::string> headers = {"Start", "Size", "Status", "PID"};
        std::vector<std::vector<std::string>> rows;
        for (auto& b : blocks_) {
            rows.push_back({
                std::to_string(b.start),
                std::to_string(b.size) + " KB",
                b.isFree() ? "FREE" : "ALLOCATED",
                b.isFree() ? "-" : ("P" + std::to_string(b.pid))
            });
        }
        Display::printTable(headers, rows);

        std::cout << "  Total free: " << totalFree() << " KB\n";
        std::cout << "  External fragmentation: " << externalFragmentation() << " KB\n";
    }

    void reset() {
        blocks_.clear();
        blocks_.push_back({0, totalSize_, -1});
    }

private:
    void splitAndAllocate(int idx, int pid, int size) {
        MemoryBlock& blk = blocks_[idx];
        if (blk.size > size) {
            MemoryBlock remaining = {blk.start + size, blk.size - size, -1};
            blk.size = size;
            blk.pid = pid;
            blocks_.insert(blocks_.begin() + idx + 1, remaining);
        } else {
            blk.pid = pid;
        }
    }

    void mergeFreeBlocks() {
        for (size_t i = 0; i + 1 < blocks_.size();) {
            if (blocks_[i].isFree() && blocks_[i + 1].isFree()) {
                blocks_[i].size += blocks_[i + 1].size;
                blocks_.erase(blocks_.begin() + (int)i + 1);
            } else {
                i++;
            }
        }
    }

    int totalSize_;
    std::vector<MemoryBlock> blocks_;
};
