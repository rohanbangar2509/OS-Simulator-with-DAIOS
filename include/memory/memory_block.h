#pragma once
#include <string>

struct MemoryBlock {
    int start;
    int size;
    int pid;  // -1 if free
    bool isFree() const { return pid == -1; }
};
