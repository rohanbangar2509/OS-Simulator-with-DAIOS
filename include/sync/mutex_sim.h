#pragma once
#include <mutex>
#include <string>
#include <thread>
#include "common/logger.h"

class SimMutex {
public:
    explicit SimMutex(const std::string& name = "Mutex") : name_(name) {}

    void lock(const std::string& caller = "") {
        Logger::instance().log("SYNC", caller + " requesting lock on " + name_);
        mtx_.lock();
        Logger::instance().log("SYNC", caller + " acquired lock on " + name_);
    }

    void unlock(const std::string& caller = "") {
        mtx_.unlock();
        Logger::instance().log("SYNC", caller + " released lock on " + name_);
    }

    std::mutex& native() { return mtx_; }
    const std::string& name() const { return name_; }

private:
    std::mutex mtx_;
    std::string name_;
};
