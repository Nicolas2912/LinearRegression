// client/src/App.js

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import './App.css';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

// Get API URL from environment variable or use default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
console.log("Using API URL:", API_URL);

function App() {
  // Input states
  const [xInput, setXInput] = useState('1, 2, 3, 4, 5');
  const [yInput, setYInput] = useState('2, 4, 5, 4, 5');
  const [predictXInput, setPredictXInput] = useState('6');
  const [lrInput, setLrInput] = useState('0.01');
  const [iterInput, setIterInput] = useState('1000');
  const [batchSizeInput, setBatchSizeInput] = useState('32');
  const [activeTheme, setActiveTheme] = useState('light');

  // Model/Result states
  const [slope, setSlope] = useState(null);
  const [intercept, setIntercept] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [lastPredictedX, setLastPredictedX] = useState(null);
  const [isTrained, setIsTrained] = useState(false);
  const [trainingTime, setTrainingTime] = useState(null);
  const [mse, setMse] = useState(null);
  const [rSquared, setRSquared] = useState(null);

  // UI states
  const [loadingTrain, setLoadingTrain] = useState(false);
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [error, setError] = useState(null);

  // Chart data state
  const [chartData, setChartData] = useState({ datasets: [] });
  const chartRef = useRef(null);


  // --- Helper functions ---
  const parseInputString = (input) => {
    if (!input || typeof input !== 'string') return [];
    return input.split(',')
      .map(val => parseFloat(val.trim()))
      .filter(val => !isNaN(val));
  };

  // --- Calculate Axis Bounds using useMemo ---
  const axisBounds = useMemo(() => {
    const xDataValues = parseInputString(xInput);
    const yDataValues = parseInputString(yInput);

    let minXVal = xDataValues.length > 0 ? Math.min(...xDataValues) : 0;
    let maxXVal = xDataValues.length > 0 ? Math.max(...xDataValues) : 10;
    let minYVal = yDataValues.length > 0 ? Math.min(...yDataValues) : 0;
    let maxYVal = yDataValues.length > 0 ? Math.max(...yDataValues) : 10;

    // Include prediction point in range calculation
    if (lastPredictedX !== null && !isNaN(lastPredictedX)) {
        minXVal = Math.min(minXVal, lastPredictedX);
        maxXVal = Math.max(maxXVal, lastPredictedX);
    }
    if (prediction !== null && !isNaN(prediction)) {
        minYVal = Math.min(minYVal, prediction);
        maxYVal = Math.max(maxYVal, prediction);
    }

    // Handle single point case
    if (minXVal === maxXVal) { maxXVal += 1; minXVal -= 1; }
    if (minYVal === maxYVal) { maxYVal += 1; minYVal -= 1; }

    // Calculate padding
    const xRange = maxXVal - minXVal;
    const yRange = maxYVal - minYVal;
    const xPadding = Math.max(xRange * 0.1, 1);
    const yPadding = Math.max(yRange * 0.1, 1);

    // Apply padding
    return {
        minX: minXVal - xPadding,
        maxX: maxXVal + xPadding,
        minY: minYVal - yPadding,
        maxY: maxYVal + yPadding,
    };
    // Dependencies for recalculation
  }, [xInput, yInput, lastPredictedX, prediction]);


  // --- Updated updateChart Function ---
  const updateChart = (
    xValues = [],
    yValues = [],
    currentSlope = null,
    currentIntercept = null,
    predictionX = null,
    predictionY = null,
    bounds // Pass the calculated axisBounds here
   ) => {
  console.log("updateChart called with predictionX:", predictionX, "predictionY:", predictionY); // Log inputs
  console.log("Bounds:", bounds); // Log bounds

  const dataPoints = xValues.map((x, index) => ({ x: x, y: yValues[index] }));

  const datasets = [{ /* ... Data Points dataset ... */
      label: 'Data Points', data: dataPoints, backgroundColor: 'rgba(255, 99, 132, 1)', pointRadius: 5,
  }];

  // Add regression line
  if (currentSlope !== null && currentIntercept !== null && bounds) {
      const lineStartX = bounds.minX; const lineEndX = bounds.maxX;
      datasets.push({ /* ... Regression Line dataset ... */
          label: 'Regression Line', data: [ { x: lineStartX, y: currentSlope * lineStartX + currentIntercept }, { x: lineEndX, y: currentSlope * lineEndX + currentIntercept }, ],
          borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 2, pointRadius: 0, fill: false, tension: 0, showLine: true, type: 'line',
      });
  }

  let addedPredictionViz = false; // Flag to check if prediction datasets were added

  // Add prediction visualization - FIXED: Removed unnecessary bounds check that might prevent visualization
  if (predictionX !== null && predictionY !== null && !isNaN(predictionX) && !isNaN(predictionY)) {
      addedPredictionViz = true; // Set flag
      console.log("Adding prediction visualization datasets..."); // Log adding step

      // 1. Prediction Point - Make it larger and more visible
      datasets.push({ /* ... Prediction point dataset ... */
           label: 'Prediction', 
           data: [{ x: predictionX, y: predictionY }], 
           backgroundColor: 'rgba(75, 192, 192, 1)', 
           pointRadius: 9,  // Increased from 7
           pointStyle: 'crossRot', 
           borderColor: 'rgba(0, 0, 0, 0.8)',
           borderWidth: 2,
           showLine: false,
      });

      // Use bounds.minY and bounds.minX for guide line origins if bounds exist
      const yAxisMin = bounds ? (bounds.minY < 0 ? bounds.minY : 0) : 0;
      const xAxisMin = bounds ? (bounds.minX < 0 ? bounds.minX : 0) : 0;

      // 2. Vertical Dotted Line
      datasets.push({ /* ... Vertical guide dataset ... */
           label: 'Prediction Guide (Vertical)', 
           data: [ { x: predictionX, y: yAxisMin }, { x: predictionX, y: predictionY } ], 
           borderColor: 'rgba(153, 102, 255, 0.7)', 
           borderWidth: 1.5, 
           borderDash: [5, 5], 
           pointRadius: 0, 
           fill: false, 
           tension: 0, 
           showLine: true, 
           type: 'line',
      });
      // 3. Horizontal Dotted Line
      datasets.push({ /* ... Horizontal guide dataset ... */
           label: 'Prediction Guide (Horizontal)', 
           data: [ { x: xAxisMin, y: predictionY }, { x: predictionX, y: predictionY } ], 
           borderColor: 'rgba(153, 102, 255, 0.7)', 
           borderWidth: 1.5, 
           borderDash: [5, 5], 
           pointRadius: 0, 
           fill: false, 
           tension: 0, 
           showLine: true, 
           type: 'line',
      });
  }

  console.log(`Final datasets array length: ${datasets.length}. Added prediction viz: ${addedPredictionViz}`); // Log final state
  
  if (addedPredictionViz) {
    console.log("Prediction point data:", predictionX, predictionY);
    console.log("Dataset 2 (prediction):", datasets[2]?.data);
  }

  setChartData({ datasets });
};
  // --- End updated updateChart ---


  // --- Update useEffect to pass axisBounds ---
  // --- useEffect: Update chart for Base Data & Model Line changes ---
  useEffect(() => {
    console.log("Effect [MAIN Chart Update] running..."); // Log which effect runs
    const xVals = parseInputString(xInput);
    const yVals = parseInputString(yInput);

    // Determine if prediction data is valid and should be shown
    const showPrediction = prediction !== null && lastPredictedX !== null && !isNaN(prediction) && !isNaN(lastPredictedX);
    const predX = showPrediction ? lastPredictedX : null;
    const predY = showPrediction ? prediction : null;

    console.log(`Effect [MAIN Chart Update]: showPrediction=${showPrediction}, predX=${predX}, predY=${predY}`);

    // This effect now draws everything based on current state
    if (xVals.length > 0 && xVals.length === yVals.length) {
      console.log("Effect [MAIN Chart Update]: Updating chart with data/line" + (showPrediction ? " AND prediction." : "."));
      updateChart(xVals, yVals, slope, intercept, predX, predY, axisBounds);
    } else if (xVals.length === 0 && yVals.length === 0) {
      console.log("Effect [MAIN Chart Update]: Clearing chart.");
      updateChart([], [], null, null, null, null, axisBounds); // Clear chart
    }
    // Now depends on prediction state as well, ensuring redraw includes it when set
  }, [xInput, yInput, slope, intercept, axisBounds, prediction, lastPredictedX]); // ADD prediction and lastPredictedX


  // --- useEffect: Clear Prediction state if input data becomes invalid/empty ---
  useEffect(() => {
    const xVals = parseInputString(xInput);
    const yVals = parseInputString(yInput);

    if (xVals.length === 0 || yVals.length === 0 || xVals.length !== yVals.length) {
         // Only clear prediction state if data is invalid AND a prediction currently exists
         if(prediction !== null || lastPredictedX !== null) {
             console.log("Effect [input validation]: Clearing prediction state due to invalid/empty data.");
             setPrediction(null);
             setLastPredictedX(null);
             // Optionally force a chart redraw without prediction here if needed,
             // though the main effect should handle the base data redraw correctly.
             // updateChart(xVals, yVals, slope, intercept, null, null, axisBounds);
         }
    }
    // Only depends on the raw inputs for this specific clearing task
  }, [xInput, yInput]); // Note: Removed slope/intercept/bounds dependencies here

  // --- Keep Theme Toggle Effect Separate ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  const toggleTheme = () => {
    setActiveTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };


  // --- Update handleTrain to pass axisBounds ---
  const handleTrain = async () => {
    setError(null); 
    setLoadingTrain(true);
    setSlope(null); 
    setIntercept(null); 
    setPrediction(null); 
    setLastPredictedX(null);
    setIsTrained(false); 
    setTrainingTime(null); 
    setMse(null); 
    setRSquared(null);

    const x_values = parseInputString(xInput);
    const y_values = parseInputString(yInput);
    const learning_rate = parseFloat(lrInput);
    const max_iterations = parseInt(iterInput, 10);
    const batch_size = parseInt(batchSizeInput, 10);

    // Update chart immediately (pass current bounds)
    if (x_values.length === y_values.length) {
      updateChart(x_values, y_values, null, null, null, null, axisBounds);
    }

    // Input validation
    if (x_values.length === 0 || y_values.length === 0 || x_values.length !== y_values.length) {
        setError("Invalid input: X and Y must be comma-separated numbers and have the same length.");
        setLoadingTrain(false);
        return;
    }
    if (isNaN(learning_rate) || isNaN(max_iterations) || isNaN(batch_size) || batch_size <= 0) {
        setError("Invalid input: Learning Rate, Max Iterations, and Batch Size must be valid positive numbers.");
        setLoadingTrain(false);
        return;
    }

    try {
      const response = await fetch(`${API_URL}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x_values, y_values, learning_rate, max_iterations, batch_size }),
      });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.error || `HTTP error! Status: ${response.status}`); }

      // Update state with NEW model results
      setSlope(data.slope); // This will trigger the useEffect
      setIntercept(data.intercept); // This will trigger the useEffect
      setTrainingTime(data.trainingTimeMs);
      setMse(data.mse);
      setRSquared(data.r_squared);
      setIsTrained(true);

      // NOTE: We no longer need to call updateChart here,
      // the useEffect listening to slope/intercept/axisBounds will handle it.

    } catch (err) {
       console.error("Training failed:", err);
       setError(err.message || "An unknown error occurred during training.");
       updateChart(x_values, y_values, null, null, null, null, axisBounds); // Clear line on error
    } finally {
      setLoadingTrain(false);
    }
  };
  // --- End handleTrain ---


  // --- Update handlePredict to pass axisBounds ---
  const handlePredict = async () => {
    console.log("handlePredict called."); // Log function call
    console.log("isTrained state:", isTrained); // Log trained state
    console.log("Current model:", { slope, intercept }); // Log current model parameters

    if (!isTrained) {
      console.log("Exiting handlePredict because model is not trained.");
      setError("Train the model before predicting.");
      return;
    }
    setError(null);
    setLoadingPredict(true);
    setPrediction(null); // Clear previous numerical prediction value

    const x_value = parseFloat(predictXInput);
    console.log("Parsed x_value for prediction:", x_value);

    if (isNaN(x_value)) {
      console.log("Exiting handlePredict because x_value is NaN.");
      setError("Invalid input: Prediction X value must be a number.");
      setLoadingPredict(false);
      return;
    }

    console.log("Sending prediction request to API...");

    try {
      // Make API call to get prediction
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x_value }),
      });

      console.log("API Response Status:", response.status);
      console.log("API Response OK:", response.ok);

      const data = await response.json();
      console.log("API Response Data:", data);

      if (!response.ok) {
        // Log the error from the server if available
        console.error("API Error Response:", data.error || 'Unknown API error');
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }

      // Store prediction results
      const newPredictionY = data.prediction;
      console.log("Prediction successful, received Y:", newPredictionY);
      setPrediction(newPredictionY);
      setLastPredictedX(x_value); // Setting state triggers useEffect

      // Update chart WITH the prediction visualization, passing current bounds
      const x_values_current = parseInputString(xInput);
      const y_values_current = parseInputString(yInput);

      console.log("Calling updateChart with prediction:", x_value, newPredictionY);
      
      // IMPORTANT: If server is down, calculate prediction locally as fallback
      if (newPredictionY === undefined || newPredictionY === null) {
        console.log("WARNING: No prediction value returned from API, calculating locally");
        const localPrediction = slope * x_value + intercept;
        setPrediction(localPrediction);
        updateChart(
            x_values_current,
            y_values_current,
            slope,
            intercept,
            x_value,
            localPrediction,
            axisBounds
        );
      } else {
        updateChart(
            x_values_current,
            y_values_current,
            slope,
            intercept,
            x_value,
            newPredictionY,
            axisBounds
        );
      }
      console.log("Chart updated with prediction viz.");

    } catch (err) {
       console.error("Prediction fetch/processing failed:", err);
       setError(err.message || "An unknown error occurred during prediction.");
       
       // If we have trained model parameters, calculate prediction locally even if API fails
       if (slope !== null && intercept !== null) {
         console.log("API failed but calculating prediction locally using model parameters");
         const localPrediction = slope * x_value + intercept;
         setPrediction(localPrediction);
         setLastPredictedX(x_value);
         
         const x_values_current = parseInputString(xInput);
         const y_values_current = parseInputString(yInput);
         
         updateChart(
             x_values_current,
             y_values_current,
             slope,
             intercept,
             x_value,
             localPrediction,
             axisBounds
         );
       } else {
         // Only clear chart if we can't calculate locally
         const x_values_current = parseInputString(xInput);
         const y_values_current = parseInputString(yInput);
         updateChart(x_values_current, y_values_current, slope, intercept, null, null, axisBounds);
         setLastPredictedX(null);
       }
    } finally {
      console.log("Setting loadingPredict to false.");
      setLoadingPredict(false);
    }
  };
  // --- End handlePredict ---

  // Helper to format time
  const formatTime = (timeMs) => {
    if (timeMs === null || isNaN(timeMs)) return '';
    if (timeMs < 1000) {
      return `${timeMs.toFixed(0)} ms`;
    } else {
      return `${(timeMs / 1000).toFixed(2)} s`;
    }
  }

  // Helper to format metrics
  const formatMetric = (value, type) => {
    if (value === null || isNaN(value)) return '';
    switch(type) {
      case 'mse':
        return value.toFixed(4);
      case 'r2':
        return (value * 100).toFixed(2) + '%';
      default:
        return value.toString();
    }
  };

  // --- Base Chart Options (useMemo) ---
  const baseChartOptions = useMemo(() => ({
     responsive: true, 
     maintainAspectRatio: false,
     plugins: {
       legend: {
          labels: {
             filter: function(legendItem, chartData) {
                return legendItem.text && !legendItem.text.includes('Guide');
             }
          }
       },
       title: { display: true, text: 'Linear Regression Data and Fit' },
       tooltip: {
         callbacks: {
           label: function(context) {
             let label = context.dataset.label || '';
             if (label && label.includes('Guide')) return null;
             if (label) { label += ': '; }
             if (context.parsed.y !== null) {
               label += `(X: ${context.parsed.x.toFixed(2)}, Y: ${context.parsed.y.toFixed(2)})`;
             }
             return label;
           }
         }
       }
     },
     scales: {
       x: { 
         type: 'linear', 
         position: 'bottom', 
         title: { display: true, text: 'X Values' }, 
         grid: { color: 'rgba(128, 128, 128, 0.2)' } 
       },
       y: { 
         title: { display: true, text: 'Y Values' }, 
         grid: { color: 'rgba(128, 128, 128, 0.2)' } 
       }
     }
  }), []);


  // --- JSX Return ---
  return (
    <div data-theme={activeTheme} className="min-h-screen bg-base-100">
      {/* Navbar */}
      <div className="navbar bg-base-300 shadow-lg sticky top-0 z-50">
        <div className="flex-1">
          <a href="/" className="btn btn-ghost text-xl">C++ Linear Regression</a>
        </div>
        <div className="flex-none">
          <button className="btn btn-square btn-ghost" onClick={toggleTheme}>
            {activeTheme === 'light' ? 
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              :
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          </button>
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-6">
        {/* Error display */}
        {error && (
          <div role="alert" className="alert alert-error mb-6 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* --- Construct dynamic options and Render Main Grid --- */}
        {(() => {
            // Use the pre-calculated axisBounds from useMemo
            const dynamicChartOptions = {
                ...baseChartOptions,
                scales: {
                    ...baseChartOptions.scales,
                    x: {
                        ...baseChartOptions.scales.x,
                        min: axisBounds.minX,
                        max: axisBounds.maxX,
                    },
                    y: {
                        ...baseChartOptions.scales.y,
                        min: axisBounds.minY,
                        max: axisBounds.maxY,
                    }
                },
                // Add animation configuration
                animation: {
                    duration: 500,  // Shorter animation duration
                    easing: 'easeOutQuad'
                },
                // Make sure prediction points are drawn on top
                elements: {
                    point: {
                        // Default radius to use if not specified in dataset
                        radius: 5,
                        // Ensure all points are always drawn (never hidden)
                        hoverRadius: 8
                    }
                }
            };

           // --- Render the rest of the component using dynamicChartOptions ---
           return (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Training Form Card */}
               <div className="card bg-base-200 shadow-xl">
                 <div className="card-body">
                    <h2 className="card-title text-2xl">Train Your Model</h2>
                    <div className="form-control w-full"> 
                      <label className="label"><span className="label-text">X Values (comma-separated)</span></label> 
                      <input type="text" value={xInput} onChange={(e) => setXInput(e.target.value)} disabled={loadingTrain} className="input input-bordered w-full" /> 
                    </div>
                    <div className="form-control w-full"> 
                      <label className="label"><span className="label-text">Y Values (comma-separated)</span></label> 
                      <input type="text" value={yInput} onChange={(e) => setYInput(e.target.value)} disabled={loadingTrain} className="input input-bordered w-full" /> 
                    </div>
                    <div className="divider">Hyperparameters</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="form-control"> 
                          <label className="label"><span className="label-text">Learning Rate</span></label> 
                          <input type="number" step="0.001" value={lrInput} onChange={(e) => setLrInput(e.target.value)} disabled={loadingTrain} className="input input-bordered" /> 
                        </div>
                        <div className="form-control"> 
                          <label className="label"><span className="label-text">Max Iterations</span></label> 
                          <input type="number" step="100" value={iterInput} onChange={(e) => setIterInput(e.target.value)} disabled={loadingTrain} className="input input-bordered" /> 
                        </div>
                        <div className="form-control"> 
                          <label className="label"><span className="label-text">Batch Size</span></label> 
                          <input type="number" step="1" min="1" value={batchSizeInput} onChange={(e) => setBatchSizeInput(e.target.value)} disabled={loadingTrain} className="input input-bordered" /> 
                        </div>
                    </div>
                    <div className="card-actions justify-end mt-4"> 
                      <button className={`btn btn-primary ${loadingTrain ? 'loading' : ''}`} onClick={handleTrain} disabled={loadingTrain}> 
                        {loadingTrain ? 'Training...' : 'Train Model'} 
                      </button> 
                    </div>
                    {isTrained && ( 
                      <div className="mt-6 bg-base-300 p-4 rounded-lg">
                        <h3 className="font-bold text-lg mb-2">Model Results</h3>
                        <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                          <div className="stat">
                            <div className="stat-title">Slope</div>
                            <div className="stat-value text-primary">{slope?.toFixed(4)}</div>
                          </div>
                          <div className="stat">
                            <div className="stat-title">Intercept</div>
                            <div className="stat-value text-primary">{intercept?.toFixed(4)}</div>
                          </div>
                          <div className="stat">
                            <div className="stat-title">Training Time</div>
                            <div className="stat-value text-secondary">{formatTime(trainingTime)}</div>
                          </div>
                        </div>
                        <div className="stats shadow w-full mt-4">
                          <div className="stat">
                            <div className="stat-title">Mean Squared Error</div>
                            <div className="stat-value text-accent">{formatMetric(mse, 'mse')}</div>
                            <div className="stat-desc">Lower is better</div>
                          </div>
                          <div className="stat">
                            <div className="stat-title">R² Score</div>
                            <div className="stat-value text-accent">{formatMetric(rSquared, 'r2')}</div>
                            <div className="stat-desc">Higher is better</div>
                          </div>
                        </div>
                      </div>
                    )}
                 </div>
               </div> {/* End Training Card */}

               {/* Visualization & Prediction Column */}
               <div className="flex flex-col gap-6">
                 {/* Chart Card */}
                 <div className="card bg-base-200 shadow-xl">
                   <div className="card-body">
                     <h2 className="card-title text-2xl">Visualization</h2>
                     <div className="chart-container" style={{ height: '400px' }}>
                       {(chartData.datasets?.[0]?.data?.length > 0 || lastPredictedX !== null) ? (
                           <Scatter ref={chartRef} data={chartData} options={dynamicChartOptions} />
                       ) : (
                           <div className="flex items-center justify-center h-full text-gray-500">
                             <p>Enter data and train the model to see the plot.</p>
                           </div>
                       )}
                     </div>
                     {/* Debug info to help troubleshoot prediction point issues */}
                     {lastPredictedX !== null && prediction !== null && (
                       <div className="text-xs text-gray-500 mt-2">
                         Prediction: ({lastPredictedX.toFixed(2)}, {prediction.toFixed(2)})
                         {/* Display dataset count for debugging */}
                         · Datasets: {chartData.datasets?.length || 0}
                       </div>
                     )}
                   </div>
                 </div> {/* End Chart Card */}

                 {/* Prediction Card - make sure proper response is displayed */}
                 <div className="card bg-base-200 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title text-2xl">Make Predictions</h2>
                        <div className="form-control"> 
                          <label className="label"><span className="label-text">X Value for Prediction</span></label> 
                          <div className="join w-full"> 
                            <input type="number" value={predictXInput} onChange={(e) => setPredictXInput(e.target.value)} disabled={loadingPredict || !isTrained} className="input input-bordered join-item w-full" /> 
                            <button className={`btn btn-secondary join-item ${loadingPredict ? 'loading' : ''}`} onClick={handlePredict} disabled={loadingPredict || !isTrained}> 
                              {loadingPredict ? 'Predicting...' : 'Predict'} 
                            </button> 
                          </div> 
                        </div>
                        {prediction !== null && lastPredictedX !== null && ( 
                          <div role="alert" className="alert alert-success mt-4 shadow-lg"> 
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div>
                              <span className="font-bold">Predicted Y for X = {lastPredictedX}:</span> {prediction.toFixed(4)}
                            </div>
                          </div> 
                        )}
                        {!isTrained && ( 
                          <div role="alert" className="alert alert-warning mt-4 shadow-lg"> 
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span>Train the model first before making predictions</span>
                          </div> 
                        )}
                    </div>
                 </div> {/* End Prediction Card */}
               </div> {/* End Viz & Prediction Column */}
             </div> // End Main Grid
           ); // End return inside IIFE
        })()} {/* End IIFE */}


        {/* Footer */}
        <footer className="footer footer-center p-4 bg-base-300 text-base-content rounded mt-8">
          <div>
            <p>C++ Linear Regression with React + DaisyUI Frontend</p>
          </div>
        </footer>

      </div> {/* End Container */}
    </div> // End App Div
  );
}

export default App;