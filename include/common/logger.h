#pragma once
#include <iostream>
#include <string>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <mutex>
#include "common/display.h"

class Logger {
public:
    static Logger& instance() {
        static Logger inst;
        return inst;
    }

    void reset() {
        start_ = std::chrono::steady_clock::now();
    }

    void log(const std::string& msg) {
        std::lock_guard<std::mutex> lk(mtx_);
        std::cout << Display::Color::DIM << "[" << timestamp() << "] "
                  << Display::Color::RESET << msg << "\n";
    }

    void log(const std::string& tag, const std::string& msg) {
        std::lock_guard<std::mutex> lk(mtx_);
        std::cout << Display::Color::DIM << "[" << timestamp() << "] "
                  << Display::Color::CYAN << tag << Display::Color::RESET
                  << " " << msg << "\n";
    }

private:
    Logger() : start_(std::chrono::steady_clock::now()) {}
    std::chrono::steady_clock::time_point start_;
    std::mutex mtx_;

    std::string timestamp() {
        auto now = std::chrono::steady_clock::now();
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now - start_).count();
        int sec = (int)(ms / 1000);
        int milli = (int)(ms % 1000);
        std::ostringstream oss;
        oss << std::setfill('0') << std::setw(2) << (sec / 60) << ":"
            << std::setw(2) << (sec % 60) << "."
            << std::setw(3) << milli;
        return oss.str();
    }
};
