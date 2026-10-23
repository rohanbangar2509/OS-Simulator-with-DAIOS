cmake_minimum_required(VERSION 3.16)
project(mini_os_sim LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

include_directories(${PROJECT_SOURCE_DIR}/include)

file(GLOB_RECURSE SOURCES "src/*.cpp")

add_executable(mini_os_sim ${SOURCES})

find_package(Threads REQUIRED)
target_link_libraries(mini_os_sim Threads::Threads)
