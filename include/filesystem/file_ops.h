#pragma once
#include "filesystem/virtual_disk.h"
#include "filesystem/directory.h"
#include "common/display.h"
#include <string>
#include <cstring>
#include <iostream>
#include <sstream>
#include <vector>

class FileSystem {
public:
    explicit FileSystem(VirtualDisk& disk) : disk_p_(&disk), cwdBlock_(ROOT_DIR_START) {
        cwdPath_ = "/";
    }

    void ls() {
        auto entries = readDirectory(*disk_p_, cwdBlock_);
        std::vector<std::string> headers = {"Name", "Type", "Size", "First Block"};
        std::vector<std::vector<std::string>> rows;
        for (auto& e : entries) {
            if (!e.used) continue;
            rows.push_back({
                std::string(e.name),
                e.isDirectory ? "DIR" : "FILE",
                std::to_string(e.size) + " B",
                std::to_string(e.firstBlock)
            });
        }
        if (rows.empty()) {
            Display::printInfo("Directory is empty.");
        } else {
            Display::printTable(headers, rows);
        }
    }

    bool createFile(const std::string& name) {
        if (name.size() > 55) { Display::printError("Name too long."); return false; }
        auto entries = readDirectory(*disk_p_, cwdBlock_);
        if (findEntry(entries, name) >= 0) {
            Display::printError("'" + name + "' already exists.");
            return false;
        }
        int freeIdx = findFreeEntry(entries);
        if (freeIdx < 0) { Display::printError("Directory full."); return false; }

        DirEntry de;
        std::strncpy(de.name, name.c_str(), 55);
        de.firstBlock = 0;
        de.size = 0;
        de.isDirectory = false;
        de.used = true;
        entries[freeIdx] = de;
        writeDirectory(*disk_p_, cwdBlock_, entries);
        return true;
    }

    bool mkdir(const std::string& name) {
        if (name.size() > 55) { Display::printError("Name too long."); return false; }
        auto entries = readDirectory(*disk_p_, cwdBlock_);
        if (findEntry(entries, name) >= 0) {
            Display::printError("'" + name + "' already exists.");
            return false;
        }
        int freeIdx = findFreeEntry(entries);
        if (freeIdx < 0) { Display::printError("Directory full."); return false; }

        int newBlock = disk_p_->allocateBlock();
        if (newBlock < 0) { Display::printError("No free blocks."); return false; }

        char emptyDir[BLOCK_SIZE] = {0};
        disk_p_->writeBlock(newBlock, emptyDir);

        DirEntry de;
        std::strncpy(de.name, name.c_str(), 55);
        de.firstBlock = newBlock;
        de.size = 0;
        de.isDirectory = true;
        de.used = true;
        entries[freeIdx] = de;
        writeDirectory(*disk_p_, cwdBlock_, entries);
        return true;
    }

    bool writeFile(const std::string& name, const std::string& content) {
        auto entries = readDirectory(*disk_p_, cwdBlock_);
        int idx = findEntry(entries, name);
        if (idx < 0) {
            if (!createFile(name)) return false;
            entries = readDirectory(*disk_p_, cwdBlock_);
            idx = findEntry(entries, name);
        }

        auto& de = entries[idx];
        if (de.isDirectory) { Display::printError("'" + name + "' is a directory."); return false; }

        if (de.firstBlock > 0) disk_p_->freeChain(de.firstBlock);

        int bytesLeft = (int)content.size();
        const char* data = content.c_str();
        int prevBlock = -1, firstBlock = -1;
        int offset = 0;

        while (bytesLeft > 0) {
            int blk = disk_p_->allocateBlock();
            if (blk < 0) { Display::printError("Disk full."); return false; }
            if (firstBlock < 0) firstBlock = blk;
            if (prevBlock >= 0) disk_p_->writeFAT(prevBlock, blk);

            char buf[BLOCK_SIZE] = {0};
            int toWrite = std::min(bytesLeft, BLOCK_SIZE);
            std::memcpy(buf, data + offset, toWrite);
            disk_p_->writeBlock(blk, buf);

            offset += toWrite;
            bytesLeft -= toWrite;
            prevBlock = blk;
        }

        de.firstBlock = firstBlock > 0 ? firstBlock : 0;
        de.size = (int)content.size();
        entries[idx] = de;
        writeDirectory(*disk_p_, cwdBlock_, entries);
        return true;
    }

    std::string readFile(const std::string& name) {
        auto entries = readDirectory(*disk_p_, cwdBlock_);
        int idx = findEntry(entries, name);
        if (idx < 0) { Display::printError("File not found."); return ""; }
        auto& de = entries[idx];
        if (de.isDirectory) { Display::printError("'" + name + "' is a directory."); return ""; }
        if (de.firstBlock == 0 || de.size == 0) return "";

        std::string result;
        int cur = de.firstBlock;
        int remaining = de.size;
        while (cur > 0 && cur != FAT_EOF && remaining > 0) {
            char buf[BLOCK_SIZE];
            disk_p_->readBlock(cur, buf);
            int toRead = std::min(remaining, BLOCK_SIZE);
            result.append(buf, toRead);
            remaining -= toRead;
            cur = disk_p_->readFAT(cur);
        }
        return result;
    }

    bool deleteEntry(const std::string& name) {
        auto entries = readDirectory(*disk_p_, cwdBlock_);
        int idx = findEntry(entries, name);
        if (idx < 0) { Display::printError("'" + name + "' not found."); return false; }
        auto& de = entries[idx];
        if (de.firstBlock > 0) disk_p_->freeChain(de.firstBlock);
        de.used = false;
        std::memset(de.name, 0, sizeof(de.name));
        de.firstBlock = 0;
        de.size = 0;
        entries[idx] = de;
        writeDirectory(*disk_p_, cwdBlock_, entries);
        return true;
    }

    bool cd(const std::string& name) {
        if (name == "/") {
            cwdBlock_ = ROOT_DIR_START;
            cwdPath_ = "/";
            return true;
        }
        if (name == "..") {
            if (dirStack_.empty()) {
                cwdBlock_ = ROOT_DIR_START;
                cwdPath_ = "/";
            } else {
                cwdBlock_ = dirStack_.back();
                dirStack_.pop_back();
                auto pos = cwdPath_.rfind('/', cwdPath_.size() - 2);
                if (pos != std::string::npos) cwdPath_ = cwdPath_.substr(0, pos + 1);
                else cwdPath_ = "/";
            }
            return true;
        }
        auto entries = readDirectory(*disk_p_, cwdBlock_);
        int idx = findEntry(entries, name);
        if (idx < 0 || !entries[idx].isDirectory) {
            Display::printError("Directory not found.");
            return false;
        }
        dirStack_.push_back(cwdBlock_);
        cwdBlock_ = entries[idx].firstBlock;
        cwdPath_ += name + "/";
        return true;
    }

    bool rename(const std::string& oldName, const std::string& newName) {
        auto entries = readDirectory(*disk_p_, cwdBlock_);
        int idx = findEntry(entries, oldName);
        if (idx < 0) { Display::printError("'" + oldName + "' not found."); return false; }
        if (findEntry(entries, newName) >= 0) { Display::printError("'" + newName + "' already exists."); return false; }
        std::memset(entries[idx].name, 0, sizeof(entries[idx].name));
        std::strncpy(entries[idx].name, newName.c_str(), 55);
        writeDirectory(*disk_p_, cwdBlock_, entries);
        return true;
    }

    std::string cwd() const { return cwdPath_; }

private:
    VirtualDisk* disk_p_;
    int cwdBlock_;
    std::string cwdPath_;
    std::vector<int> dirStack_;
};
