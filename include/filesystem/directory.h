#pragma once
#include "filesystem/virtual_disk.h"
#include <vector>
#include <string>

inline std::vector<DirEntry> readDirectory(VirtualDisk& disk, int dirBlock) {
    char buf[BLOCK_SIZE];
    disk.readBlock(dirBlock, buf);
    std::vector<DirEntry> entries;
    for (int i = 0; i < DIR_ENTRIES_PER_BLOCK; i++) {
        DirEntry de;
        std::memcpy(&de, buf + i * sizeof(DirEntry), sizeof(DirEntry));
        entries.push_back(de);
    }
    return entries;
}

inline void writeDirectory(VirtualDisk& disk, int dirBlock, const std::vector<DirEntry>& entries) {
    char buf[BLOCK_SIZE];
    std::memset(buf, 0, BLOCK_SIZE);
    for (int i = 0; i < (int)entries.size() && i < DIR_ENTRIES_PER_BLOCK; i++) {
        std::memcpy(buf + i * sizeof(DirEntry), &entries[i], sizeof(DirEntry));
    }
    disk.writeBlock(dirBlock, buf);
}

inline int findEntry(const std::vector<DirEntry>& entries, const std::string& name) {
    for (int i = 0; i < (int)entries.size(); i++) {
        if (entries[i].used && std::string(entries[i].name) == name)
            return i;
    }
    return -1;
}

inline int findFreeEntry(const std::vector<DirEntry>& entries) {
    for (int i = 0; i < (int)entries.size(); i++) {
        if (!entries[i].used) return i;
    }
    return -1;
}
