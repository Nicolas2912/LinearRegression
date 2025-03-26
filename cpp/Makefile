# Compiler
CXX = g++
# Compiler flags: -std=c++11 for modern C++, -O2 for optimization, -Wall for warnings, -fopenmp for OpenMP
CXXFLAGS = -std=c++11 -O2 -Wall -fopenmp
# Linker flags: -lm for math library, -fopenmp for OpenMP runtime
LDFLAGS = -lm -fopenmp

# Source files
SRCS = linear_regression.cpp main_server.cpp
# Object files
OBJS = $(SRCS:.cpp=.o)
# Executable name
TARGET = linear_regression_app

# Detect operating system
ifeq ($(OS),Windows_NT)
    # Windows commands
    RM = del /Q
    EXT = .exe
else
    # Linux/Mac commands
    RM = rm -f
    EXT = 
endif

# Default target
all: $(TARGET)$(EXT)

# Link object files to create executable
$(TARGET)$(EXT): $(OBJS)
	$(CXX) $(CXXFLAGS) $^ -o $@ $(LDFLAGS)

# Compile source files into object files
%.o: %.cpp linear_regression.h
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Clean up build files - cross-platform
clean:
ifeq ($(OS),Windows_NT)
	-$(RM) $(OBJS) $(TARGET).exe 2> nul || (exit 0)
else
	$(RM) $(OBJS) $(TARGET)
endif

# Phony targets
.PHONY: all clean