#include "filesystem/file_ops.h"
#include "common/display.h"
#include <iostream>
#include <sstream>
#include <filesystem>

void runFileSystem() {
    Display::printHeader("MODULE 7: MINI FILE SYSTEM");

    std::string diskPath = "virtual_disk.bin";
    std::filesystem::create_directories(std::filesystem::path(diskPath).parent_path().empty()
        ? std::filesystem::current_path()
        : std::filesystem::path(diskPath).parent_path());
    VirtualDisk disk(diskPath);

    if (!disk.exists()) {
        Display::printInfo("Formatting virtual disk at " + diskPath + " ...");
        disk.format();
        Display::printSuccess("Virtual disk created (" + std::to_string(TOTAL_BLOCKS * BLOCK_SIZE / 1024) + " KB).");
    } else {
        Display::printInfo("Using existing virtual disk: " + diskPath);
    }

    FileSystem fs(disk);

    Display::printInfo("Type 'help' for available commands.\n");

    while (true) {
        std::cout << Display::Color::GREEN << "minifs:" << fs.cwd()
                  << Display::Color::RESET << "$ ";
        std::string line;
        std::getline(std::cin, line);
        if (line.empty()) continue;

        std::istringstream iss(line);
        std::string cmd;
        iss >> cmd;

        if (cmd == "exit" || cmd == "quit") {
            return;
        }
        else if (cmd == "help") {
            std::cout << "\n  Available commands:\n";
            std::cout << "    ls                    - list directory contents\n";
            std::cout << "    mkdir <name>          - create directory\n";
            std::cout << "    cd <name>             - change directory (use .. to go up, / for root)\n";
            std::cout << "    create <name>         - create empty file\n";
            std::cout << "    write <name> <text>   - write text to file\n";
            std::cout << "    cat <name>            - read file contents\n";
            std::cout << "    rm <name>             - delete file or directory\n";
            std::cout << "    rename <old> <new>    - rename file or directory\n";
            std::cout << "    format                - format disk (erase everything)\n";
            std::cout << "    exit                  - back to main menu\n\n";
        }
        else if (cmd == "ls") {
            fs.ls();
        }
        else if (cmd == "mkdir") {
            std::string name;
            iss >> name;
            if (name.empty()) { Display::printError("Usage: mkdir <name>"); continue; }
            if (fs.mkdir(name)) Display::printSuccess("Directory '" + name + "' created.");
        }
        else if (cmd == "cd") {
            std::string name;
            iss >> name;
            if (name.empty()) { Display::printError("Usage: cd <name>"); continue; }
            fs.cd(name);
        }
        else if (cmd == "create") {
            std::string name;
            iss >> name;
            if (name.empty()) { Display::printError("Usage: create <name>"); continue; }
            if (fs.createFile(name)) Display::printSuccess("File '" + name + "' created.");
        }
        else if (cmd == "write") {
            std::string name;
            iss >> name;
            std::string rest;
            std::getline(iss, rest);
            while (!rest.empty() && rest[0] == ' ') rest.erase(0, 1);
            if (rest.size() >= 2 && rest.front() == '"' && rest.back() == '"')
                rest = rest.substr(1, rest.size() - 2);
            if (name.empty() || rest.empty()) {
                Display::printError("Usage: write <name> <text>");
                continue;
            }
            if (fs.writeFile(name, rest))
                Display::printSuccess("Wrote " + std::to_string(rest.size()) + " bytes to '" + name + "'.");
        }
        else if (cmd == "cat") {
            std::string name;
            iss >> name;
            if (name.empty()) { Display::printError("Usage: cat <name>"); continue; }
            std::string content = fs.readFile(name);
            if (!content.empty())
                std::cout << content << "\n";
        }
        else if (cmd == "rm") {
            std::string name;
            iss >> name;
            if (name.empty()) { Display::printError("Usage: rm <name>"); continue; }
            if (fs.deleteEntry(name)) Display::printSuccess("'" + name + "' deleted.");
        }
        else if (cmd == "rename") {
            std::string oldN, newN;
            iss >> oldN >> newN;
            if (oldN.empty() || newN.empty()) {
                Display::printError("Usage: rename <old> <new>");
                continue;
            }
            if (fs.rename(oldN, newN))
                Display::printSuccess("Renamed '" + oldN + "' to '" + newN + "'.");
        }
        else if (cmd == "format") {
            disk.format();
            fs = FileSystem(disk);
            Display::printSuccess("Disk formatted.");
        }
        else {
            Display::printError("Unknown command: " + cmd + ". Type 'help' for available commands.");
        }
    }
}
