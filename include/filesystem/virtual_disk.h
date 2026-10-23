#pragma once
#include <fstream>
#include <vector>
#include <cstring>
#include <string>

const int BLOCK_SIZE = 512;
const int TOTAL_BLOCKS = 2048;  // 1 MB disk
const int FAT_ENTRIES = TOTAL_BLOCKS;

const int SUPERBLOCK_IDX = 0;
const int FAT_START = 1;
const int FAT_BLOCKS = (FAT_ENTRIES * 4 + BLOCK_SIZE - 1) / BLOCK_SIZE;
const int ROOT_DIR_START = FAT_START + FAT_BLOCKS;
const int DATA_START = ROOT_DIR_START + 1;

const int FAT_FREE = 0;
const int FAT_EOF = -1;
const int FAT_RESERVED = -2;

struct Superblock {
    int blockSize = BLOCK_SIZE;
    int totalBlocks = TOTAL_BLOCKS;
    int fatStart = FAT_START;
    int rootDirStart = ROOT_DIR_START;
    int dataStart = DATA_START;
};

struct DirEntry {
    char name[56] = {0};
    int firstBlock = 0;
    int size = 0;
    bool isDirectory = false;
    bool used = false;
};

const int DIR_ENTRIES_PER_BLOCK = BLOCK_SIZE / (int)sizeof(DirEntry);

class VirtualDisk {
public:
    explicit VirtualDisk(const std::string& path) : path_(path) {}

    bool exists() const {
        std::ifstream f(path_, std::ios::binary);
        return f.good();
    }

    void format() {
        std::vector<char> disk(TOTAL_BLOCKS * BLOCK_SIZE, 0);

        Superblock sb;
        std::memcpy(disk.data(), &sb, sizeof(sb));

        int fatOffset = FAT_START * BLOCK_SIZE;
        for (int i = 0; i < TOTAL_BLOCKS; i++) {
            int val = FAT_FREE;
            if (i <= ROOT_DIR_START) val = FAT_RESERVED;
            std::memcpy(disk.data() + fatOffset + i * 4, &val, 4);
        }

        std::ofstream f(path_, std::ios::binary | std::ios::trunc);
        f.write(disk.data(), (std::streamsize)disk.size());
        f.flush();
    }

    void readBlock(int blockNum, void* buffer) {
        std::ifstream f(path_, std::ios::binary);
        f.seekg((std::streamoff)blockNum * BLOCK_SIZE);
        f.read((char*)buffer, BLOCK_SIZE);
    }

    void writeBlock(int blockNum, const void* buffer) {
        std::fstream f(path_, std::ios::binary | std::ios::in | std::ios::out);
        f.seekp((std::streamoff)blockNum * BLOCK_SIZE);
        f.write((const char*)buffer, BLOCK_SIZE);
        f.flush();
    }

    int readFAT(int entry) {
        char buf[BLOCK_SIZE];
        int blockNum = FAT_START + (entry * 4) / BLOCK_SIZE;
        int offset = (entry * 4) % BLOCK_SIZE;
        readBlock(blockNum, buf);
        int val;
        std::memcpy(&val, buf + offset, 4);
        return val;
    }

    void writeFAT(int entry, int value) {
        char buf[BLOCK_SIZE];
        int blockNum = FAT_START + (entry * 4) / BLOCK_SIZE;
        int offset = (entry * 4) % BLOCK_SIZE;
        readBlock(blockNum, buf);
        std::memcpy(buf + offset, &value, 4);
        writeBlock(blockNum, buf);
    }

    int allocateBlock() {
        for (int i = DATA_START; i < TOTAL_BLOCKS; i++) {
            if (readFAT(i) == FAT_FREE) {
                writeFAT(i, FAT_EOF);
                return i;
            }
        }
        return -1;
    }

    void freeChain(int startBlock) {
        int cur = startBlock;
        while (cur > 0 && cur != FAT_EOF) {
            int next = readFAT(cur);
            writeFAT(cur, FAT_FREE);
            cur = next;
        }
    }

    std::string path() const { return path_; }

private:
    std::string path_;
};
