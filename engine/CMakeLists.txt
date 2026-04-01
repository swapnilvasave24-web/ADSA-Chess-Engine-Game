cmake_minimum_required(VERSION 3.14)
project(CheckmateAI VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O2")

include_directories(include)

set(SOURCES
    src/main.cpp
    src/board.cpp
    src/move_generator.cpp
    src/evaluation.cpp
    src/zobrist.cpp
    src/transposition_table.cpp
    src/move_ordering.cpp
    src/minimax_engine.cpp
    src/game_tree_node.cpp
)

add_executable(checkmate_engine ${SOURCES})
