const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001; // Allow port to be set via environment variable

// --- Configuration ---
// Determine the executable extension based on the platform
const isWindows = process.platform === 'win32';
const executableExt = isWindows ? '.exe' : '';

// Adjust the path to your C++ executable - platform-specific path
const cppExecutablePath = path.join(__dirname, '..', 'cpp', `linear_regression_app${executableExt}`);

// Verify the executable exists
if (!fs.existsSync(cppExecutablePath)) {
    console.error(`ERROR: C++ executable not found at: ${cppExecutablePath}`);
    console.error('Make sure to run the build script before starting the server.');
}
// --- End Configuration ---


// --- Middleware ---
app.use(cors()); // Allow requests from React frontend (different port)
app.use(express.json()); // Parse JSON request bodies
// --- End Middleware ---


// Store the last trained model parameters in memory (simple approach)
let trainedModel = {
    slope: null,
    intercept: null,
    trained: false
};

// --- Helper Function ---
function parseCppOutput(output) {
    const results = {};
    output.split('\n').forEach(line => {
        if (line.includes('=')) {
            const [key, value] = line.split('=', 2);
            if (key && value) {
                results[key.trim()] = parseFloat(value.trim());
            }
        }
    });
    return results;
}

// --- API Routes ---

// GET /api/health - Health check endpoint for Render
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        executable: fs.existsSync(cppExecutablePath)
    });
});

// POST /api/train
app.post('/api/train', (req, res) => {
    const { x_values, y_values, learning_rate, max_iterations, batch_size } = req.body;

    // Basic input validation
    if (!Array.isArray(x_values) || !Array.isArray(y_values) || x_values.length === 0 || x_values.length !== y_values.length) {
        return res.status(400).json({ error: 'Invalid input data. Ensure X and Y are non-empty arrays of the same length.' });
    }

    // Format data for C++ command line
    const x_str = x_values.join(',');
    const y_str = y_values.join(',');

    const args = ['train', x_str, y_str];
    if (learning_rate !== undefined) args.push(String(learning_rate));
    if (max_iterations !== undefined) args.push(String(max_iterations));
    if (batch_size !== undefined) args.push(String(batch_size));


    console.log(`Executing: ${cppExecutablePath} ${args.join(' ')}`); // Log execution

    execFile(cppExecutablePath, args, (error, stdout, stderr) => {
        if (error) {
            console.error(`C++ Execution Error: ${error.message}`);
            console.error(`C++ Stderr: ${stderr}`);
            // Try to parse stderr for a more specific C++ error message if possible
            const cppError = stderr || error.message;
            return res.status(500).json({ error: `Training failed: ${cppError}` });
        }

        console.log(`C++ Stdout: ${stdout}`); // Log success output
        const results = parseCppOutput(stdout);

        if (results.slope === undefined || results.intercept === undefined || isNaN(results.slope) || isNaN(results.intercept)) {
             console.error(`Error parsing C++ output: ${stdout}`);
             return res.status(500).json({ error: 'Failed to parse training results from C++.' });
        }

        // Store trained parameters
        trainedModel.slope = results.slope;
        trainedModel.intercept = results.intercept;
        trainedModel.trained = true;

        res.json({ 
            slope: trainedModel.slope, 
            intercept: trainedModel.intercept,
            trainingTimeMs: results.training_time_ms,
            mse: results.mse,
            r_squared: results.r_squared
        });
    });
});

// POST /api/predict
app.post('/api/predict', (req, res) => {
    const { x_value } = req.body;

    if (!trainedModel.trained) {
        return res.status(400).json({ error: 'Model not trained yet. Train the model first.' });
    }

    if (typeof x_value !== 'number') {
        return res.status(400).json({ error: 'Invalid input. x_value must be a number.' });
    }

    const args = [
        'predict',
        String(trainedModel.slope),
        String(trainedModel.intercept),
        String(x_value)
    ];

    console.log(`Executing: ${cppExecutablePath} ${args.join(' ')}`); // Log execution

    execFile(cppExecutablePath, args, (error, stdout, stderr) => {
        if (error) {
            console.error(`C++ Execution Error: ${error.message}`);
            console.error(`C++ Stderr: ${stderr}`);
            const cppError = stderr || error.message;
            return res.status(500).json({ error: `Prediction failed: ${cppError}` });
        }

        console.log(`C++ Stdout: ${stdout}`); // Log success output
        const results = parseCppOutput(stdout);

        if (results.prediction === undefined || isNaN(results.prediction)) {
            console.error(`Error parsing C++ output: ${stdout}`);
            return res.status(500).json({ error: 'Failed to parse prediction result from C++.' });
        }

        res.json({ prediction: results.prediction });
    });
});
// --- End API Routes ---


// --- Start Server ---
app.listen(port, () => {
    console.log(`Node.js server listening on http://localhost:${port}`);
    console.log(`Expecting C++ executable at: ${cppExecutablePath}`);
    
    // Log platform info
    console.log(`Platform: ${process.platform}, isWindows: ${isWindows}`);
    console.log(`Executable exists: ${fs.existsSync(cppExecutablePath)}`);
});
// --- End Start Server ---