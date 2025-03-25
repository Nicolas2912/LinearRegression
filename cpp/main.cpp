#include <iostream>
#include <vector>
#include "linear_regression.h"

int main() {
    // Example dataset
    std::vector<double> X = {1, 2, 3, 4, 5};
    std::vector<double> y = {2, 4, 5, 4, 5};

    // Create and train the linear regression model
    LinearRegression model;
    model.fit(X, y);

    // Print model parameters
    std::cout << "Slope: " << model.get_slope() << std::endl;
    std::cout << "Intercept: " << model.get_intercept() << std::endl;

    // Make predictions
    std::cout << "Prediction for x = 6: " << model.predict(6) << std::endl;

    return 0;
}