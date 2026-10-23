#pragma once
#include <vector>
#include <string>
#include <queue>
#include <list>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <climits>
#include <iostream>
#include <iomanip>
#include "common/display.h"

struct ReplacementResult {
    std::string algorithm;
    int pageFaults = 0;
    int hits = 0;
    int totalRefs = 0;
    std::vector<std::vector<int>> frameSnapshots;
    std::vector<bool> faultLog;
};

inline void printReplacementResult(const ReplacementResult& r) {
    Display::printSubHeader(r.algorithm);
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "  Total references : " << r.totalRefs << "\n";
    std::cout << "  Page faults      : " << r.pageFaults << "\n";
    std::cout << "  Hits             : " << r.hits << "\n";
    std::cout << "  Hit ratio        : " << (100.0 * r.hits / r.totalRefs) << "%\n";
    std::cout << "  Miss ratio       : " << (100.0 * r.pageFaults / r.totalRefs) << "%\n\n";

    std::cout << Display::Color::BOLD << "Step-by-step:\n" << Display::Color::RESET;
    std::cout << std::setw(6) << "Ref" << " | Frames" << std::string(20, ' ') << "| Fault?\n";
    std::cout << std::string(50, '-') << "\n";
    for (int i = 0; i < r.totalRefs; i++) {
        std::cout << std::setw(6) << r.frameSnapshots[i][0] << " | ";
        for (size_t j = 1; j < r.frameSnapshots[i].size(); j++) {
            if (r.frameSnapshots[i][j] == -1) std::cout << "- ";
            else std::cout << r.frameSnapshots[i][j] << " ";
        }
        std::cout << std::string(std::max(0, 25 - (int)(r.frameSnapshots[i].size() - 1) * 2), ' ');
        std::cout << "| " << (r.faultLog[i] ? Display::Color::RED + "FAULT" + Display::Color::RESET : "hit") << "\n";
    }
}

inline ReplacementResult runFIFO(const std::vector<int>& refs, int numFrames) {
    ReplacementResult r;
    r.algorithm = "FIFO";
    r.totalRefs = (int)refs.size();
    std::queue<int> frameQ;
    std::unordered_set<int> inFrames;
    std::vector<int> frames(numFrames, -1);

    for (int page : refs) {
        bool fault = (inFrames.find(page) == inFrames.end());
        if (fault) {
            r.pageFaults++;
            if ((int)frameQ.size() >= numFrames) {
                int victim = frameQ.front(); frameQ.pop();
                inFrames.erase(victim);
                for (auto& f : frames) if (f == victim) { f = page; break; }
            } else {
                for (auto& f : frames) if (f == -1) { f = page; break; }
            }
            frameQ.push(page);
            inFrames.insert(page);
        } else {
            r.hits++;
        }
        r.faultLog.push_back(fault);
        std::vector<int> snap = {page};
        snap.insert(snap.end(), frames.begin(), frames.end());
        r.frameSnapshots.push_back(snap);
    }
    return r;
}

inline ReplacementResult runLRU(const std::vector<int>& refs, int numFrames) {
    ReplacementResult r;
    r.algorithm = "LRU";
    r.totalRefs = (int)refs.size();
    std::list<int> lruList;
    std::unordered_map<int, std::list<int>::iterator> pageMap;
    std::vector<int> frames(numFrames, -1);

    for (int page : refs) {
        bool fault;
        if (pageMap.find(page) != pageMap.end()) {
            fault = false;
            r.hits++;
            lruList.erase(pageMap[page]);
            lruList.push_back(page);
            pageMap[page] = std::prev(lruList.end());
        } else {
            fault = true;
            r.pageFaults++;
            if ((int)lruList.size() >= numFrames) {
                int victim = lruList.front();
                lruList.pop_front();
                pageMap.erase(victim);
                for (auto& f : frames) if (f == victim) { f = page; break; }
            } else {
                for (auto& f : frames) if (f == -1) { f = page; break; }
            }
            lruList.push_back(page);
            pageMap[page] = std::prev(lruList.end());
        }
        r.faultLog.push_back(fault);
        std::vector<int> snap = {page};
        snap.insert(snap.end(), frames.begin(), frames.end());
        r.frameSnapshots.push_back(snap);
    }
    return r;
}

inline ReplacementResult runOptimal(const std::vector<int>& refs, int numFrames) {
    ReplacementResult r;
    r.algorithm = "Optimal";
    r.totalRefs = (int)refs.size();
    std::vector<int> frames(numFrames, -1);
    std::unordered_set<int> inFrames;

    for (int i = 0; i < (int)refs.size(); i++) {
        int page = refs[i];
        bool fault = (inFrames.find(page) == inFrames.end());
        if (fault) {
            r.pageFaults++;
            if ((int)inFrames.size() >= numFrames) {
                int victim = -1, farthest = -1;
                for (int f : inFrames) {
                    int nextUse = INT_MAX;
                    for (int j = i + 1; j < (int)refs.size(); j++) {
                        if (refs[j] == f) { nextUse = j; break; }
                    }
                    if (nextUse > farthest) { farthest = nextUse; victim = f; }
                }
                inFrames.erase(victim);
                for (auto& f : frames) if (f == victim) { f = page; break; }
            } else {
                for (auto& f : frames) if (f == -1) { f = page; break; }
            }
            inFrames.insert(page);
        } else {
            r.hits++;
        }
        r.faultLog.push_back(fault);
        std::vector<int> snap = {page};
        snap.insert(snap.end(), frames.begin(), frames.end());
        r.frameSnapshots.push_back(snap);
    }
    return r;
}

inline ReplacementResult runClock(const std::vector<int>& refs, int numFrames) {
    ReplacementResult r;
    r.algorithm = "Clock";
    r.totalRefs = (int)refs.size();
    std::vector<int> frames(numFrames, -1);
    std::vector<bool> refBit(numFrames, false);
    int hand = 0;
    std::unordered_set<int> inFrames;
    int count = 0;

    for (int page : refs) {
        bool fault = (inFrames.find(page) == inFrames.end());
        if (fault) {
            r.pageFaults++;
            if (count < numFrames) {
                frames[count] = page;
                refBit[count] = true;
                inFrames.insert(page);
                count++;
            } else {
                while (refBit[hand]) {
                    refBit[hand] = false;
                    hand = (hand + 1) % numFrames;
                }
                inFrames.erase(frames[hand]);
                frames[hand] = page;
                refBit[hand] = true;
                inFrames.insert(page);
                hand = (hand + 1) % numFrames;
            }
        } else {
            r.hits++;
            for (int j = 0; j < numFrames; j++)
                if (frames[j] == page) { refBit[j] = true; break; }
        }
        r.faultLog.push_back(fault);
        std::vector<int> snap = {page};
        snap.insert(snap.end(), frames.begin(), frames.end());
        r.frameSnapshots.push_back(snap);
    }
    return r;
}

inline void printReplacementComparison(const std::vector<ReplacementResult>& results) {
    Display::printSubHeader("Page Replacement Algorithm Comparison");
    std::vector<std::string> headers = {"Algorithm", "Faults", "Hits", "Hit Ratio", "Miss Ratio"};
    std::vector<std::vector<std::string>> rows;
    std::ostringstream oss;
    for (auto& r : results) {
        oss.str(""); oss << std::fixed << std::setprecision(2) << (100.0 * r.hits / r.totalRefs) << "%";
        std::string hr = oss.str();
        oss.str(""); oss << std::fixed << std::setprecision(2) << (100.0 * r.pageFaults / r.totalRefs) << "%";
        std::string mr = oss.str();
        rows.push_back({r.algorithm, std::to_string(r.pageFaults), std::to_string(r.hits), hr, mr});
    }
    Display::printTable(headers, rows);
}
