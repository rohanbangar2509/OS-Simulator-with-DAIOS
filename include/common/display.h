#pragma once
#include <iostream>
#include <string>
#include <vector>
#include <iomanip>
#include <sstream>

namespace Display {

namespace Color {
    const std::string RESET   = "\033[0m";
    const std::string RED     = "\033[31m";
    const std::string GREEN   = "\033[32m";
    const std::string YELLOW  = "\033[33m";
    const std::string BLUE    = "\033[34m";
    const std::string MAGENTA = "\033[35m";
    const std::string CYAN    = "\033[36m";
    const std::string WHITE   = "\033[37m";
    const std::string BOLD    = "\033[1m";
    const std::string DIM     = "\033[2m";
}

inline void clearScreen() {
    std::cout << "\033[2J\033[H";
}

inline void printHeader(const std::string& title) {
    int width = 50;
    std::string border(width, '=');
    std::cout << Color::CYAN << Color::BOLD;
    std::cout << "\n+" << border << "+\n";
    int pad = (width - (int)title.size()) / 2;
    std::cout << "|" << std::string(pad, ' ') << title
              << std::string(width - pad - (int)title.size(), ' ') << "|\n";
    std::cout << "+" << border << "+\n";
    std::cout << Color::RESET;
}

inline void printSubHeader(const std::string& title) {
    std::cout << "\n" << Color::YELLOW << Color::BOLD
              << "--- " << title << " ---" << Color::RESET << "\n\n";
}

inline void printSuccess(const std::string& msg) {
    std::cout << Color::GREEN << "[OK] " << msg << Color::RESET << "\n";
}

inline void printError(const std::string& msg) {
    std::cout << Color::RED << "[ERROR] " << msg << Color::RESET << "\n";
}

inline void printInfo(const std::string& msg) {
    std::cout << Color::BLUE << "[INFO] " << msg << Color::RESET << "\n";
}

inline void printPrompt(const std::string& msg) {
    std::cout << Color::MAGENTA << msg << Color::RESET;
}

inline void printMenuOption(int num, const std::string& label) {
    std::cout << "  " << Color::CYAN << num << Color::RESET << ". " << label << "\n";
}

inline void printTable(const std::vector<std::string>& headers,
                       const std::vector<std::vector<std::string>>& rows) {
    if (headers.empty()) return;
    std::vector<size_t> widths(headers.size(), 0);
    for (size_t i = 0; i < headers.size(); i++)
        widths[i] = headers[i].size();
    for (auto& row : rows)
        for (size_t i = 0; i < row.size() && i < widths.size(); i++)
            widths[i] = std::max(widths[i], row[i].size());

    auto printSep = [&]() {
        std::cout << "+";
        for (auto w : widths)
            std::cout << std::string(w + 2, '-') << "+";
        std::cout << "\n";
    };

    printSep();
    std::cout << "|";
    for (size_t i = 0; i < headers.size(); i++)
        std::cout << Color::BOLD << " " << std::left << std::setw((int)widths[i])
                  << headers[i] << Color::RESET << " |";
    std::cout << "\n";
    printSep();
    for (auto& row : rows) {
        std::cout << "|";
        for (size_t i = 0; i < headers.size(); i++) {
            std::string val = i < row.size() ? row[i] : "";
            std::cout << " " << std::left << std::setw((int)widths[i]) << val << " |";
        }
        std::cout << "\n";
    }
    printSep();
}

inline int readInt(const std::string& prompt, int lo, int hi) {
    int val;
    while (true) {
        printPrompt(prompt);
        if (std::cin >> val && val >= lo && val <= hi) {
            std::cin.ignore(10000, '\n');
            return val;
        }
        std::cin.clear();
        std::cin.ignore(10000, '\n');
        printError("Invalid input. Enter a number between "
                   + std::to_string(lo) + " and " + std::to_string(hi) + ".");
    }
}

inline std::string readLine(const std::string& prompt) {
    printPrompt(prompt);
    std::string line;
    std::getline(std::cin, line);
    return line;
}

inline void pressEnter() {
    std::cout << Color::DIM << "\nPress Enter to continue..." << Color::RESET;
    std::cin.ignore(10000, '\n');
}

} // namespace Display
