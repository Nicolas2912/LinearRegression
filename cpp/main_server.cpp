#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <stdexcept>
#include <limits>
#include <chrono> // Include for timing
#include <numeric> // For std::iota
#include <random>  // For std::shuffle, std::mt19937
#include <algorithm> // For std::min, std::shuffle
#include "linear_regression.h"

// Helper function to parse a comma-separated string into a vector of doubles
std::vector<double> parseVector(const std::string& s) {
    std::vector<double> result;
    if (s.empty()) {
        return result; // Return empty vector if input string is empty
    }
    std::stringstream ss(s);
    std::string item;
    while (std::getline(ss, item, ',')) {
        try {
            result.push_back(std::stod(item));
        } catch (const std::invalid_argument& ia) {
            std::cerr << "Error parsing value: Invalid argument '" << item << "'" << std::endl;
            throw;
        } catch (const std::out_of_range& oor) {
            std::cerr << "Error parsing value: Out of range '" << item << "'" << std::endl;
            throw;
        }
    }
    return result;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Error: Operation mode required ('train' or 'predict')." << std::endl;
        // ... (rest of usage message)
        return 1;
    }

    std::string operation = argv[1];

    try {
        if (operation == "train" && argc >= 4) {
            // Parse X and y values
            std::vector<double> X = parseVector(argv[2]);
            std::vector<double> y = parseVector(argv[3]);

            if (X.empty() || y.empty()) {
                 std::cerr << "Error: X and y data cannot be empty." << std::endl;
                 return 1;
            }
            if (X.size() != y.size()) {
                std::cerr << "Error: X and y must have the same number of elements." << std::endl;
                return 1;
            }

            // Optional learning rate, iterations, and batch_size
            double lr = 0.01;
            int max_iter = 1000;
            int batch_size = 32; // Default batch size
            if (argc >= 5) lr = std::stod(argv[4]);
            if (argc >= 6) max_iter = std::stoi(argv[5]);
            if (argc >= 7) batch_size = std::stoi(argv[6]); // Parse batch size

            // --- Measure Training Time ---
            auto start_time = std::chrono::high_resolution_clock::now();

            // Create and train the model
            // Pass batch_size to the constructor
            LinearRegression model(lr, max_iter, batch_size);
            model.fit(X, y);

            auto end_time = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);
            // --- End Measurement ---


            // Output results (including training time)
            std::cout.precision(std::numeric_limits<double>::max_digits10);
            std::cout << "slope=" << model.get_slope() << std::endl;
            std::cout << "intercept=" << model.get_intercept() << std::endl;
            std::cout << "training_time_ms=" << duration.count() << std::endl;
            std::cout << "mse=" << model.get_mse(X, y) << std::endl;
            std::cout << "r_squared=" << model.get_r_squared(X, y) << std::endl;

        } else if (operation == "predict" && argc == 5) {
            // ... (predict logic remains the same)
             double slope = std::stod(argv[2]);
            double intercept = std::stod(argv[3]);
            double x_value = std::stod(argv[4]);
            double prediction = slope * x_value + intercept;
            std::cout.precision(std::numeric_limits<double>::max_digits10);
            std::cout << "prediction=" << prediction << std::endl;

        } else {
            // Update usage message to include batch_size
            std::cerr << "Error: Invalid arguments for operation '" << operation << "'." << std::endl;
            std::cerr << "Usage:" << std::endl;
            std::cerr << "  " << argv[0] << " train <comma_sep_X> <comma_sep_y> [learning_rate] [max_iterations] [batch_size]" << std::endl;
            std::cerr << "  " << argv[0] << " predict <slope> <intercept> <x_value>" << std::endl;
            return 1;
        }
    } catch (const std::exception& e) {
        std::cerr << "Runtime Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}