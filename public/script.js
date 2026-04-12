let crossSections = [];
let heights = [];
let contourLines = [];
let areaChart = null;
let comparisonChart = null;
let lastResults = null;
let selectedFormula = 'trapezoidal';
let hasResults = false;

// DOM Elements
const numSectionsInput = document.getElementById('numSections');
const spacingInput = document.getElementById('spacing');
const addRowBtn = document.getElementById('addRowBtn');
const computeBtn = document.getElementById('computeBtn');
const loadSampleBtn = document.getElementById('loadSample');
const csvFile = document.getElementById('csvFile');
const sectionsContainer = document.getElementById('sectionsContainer');
const resultsDiv = document.getElementById('results');
const inputTable = document.getElementById('inputTable');

// Create hidden checkboxes for formula selection
const createHiddenCheckboxes = () => {
    if (!document.getElementById('chk-trapezoidal')) {
        const checkboxes = `
            <input type="hidden" id="chk-trapezoidal" checked>
            <input type="hidden" id="chk-pyramid" checked>
            <input type="hidden" id="chk-simpson38" checked>
        `;
        document.body.insertAdjacentHTML('afterbegin', checkboxes);
    }
};

// Event Listeners
computeBtn.addEventListener('click', handleComputeButtonClick);
loadSampleBtn.addEventListener('click', loadSampleData);
addRowBtn.addEventListener('click', addTableRow);

// Reset results when user changes input
function resetResults() {
    hasResults = false;
    computeBtn.innerHTML = 'COMPUTE';
    closeResultsModal();
}

numSectionsInput.addEventListener('change', () => {
    initializeTable();
    resetResults();
});

spacingInput.addEventListener('change', resetResults);

// CSV file change handler
csvFile.addEventListener('change', () => {
    handleCsvUpload();
});

// Handle compute button click - toggles between COMPUTE and SHOW RESULT
function handleComputeButtonClick(e) {
    if (hasResults) {
        showResultsModal();
    } else {
        compute();
    }
}

// Create section input fields
function createSectionInputs() {
    const num = parseInt(numSectionsInput.value);
    const spacing = parseFloat(spacingInput.value);
    
    sectionsContainer.innerHTML = '';
    crossSections = [];
    heights = [];
    contourLines = [];
    
    for (let i = 0; i < num; i++) {
        crossSections[i] = 10 * (i + 1);
        contourLines[i] = i * spacing;
        if (i < num - 1) {
            heights[i] = spacing;
        }
    }
    
    displayInputTable();
}

// Initialize table based on numSections input
function initializeTable() {
    const num = parseInt(numSectionsInput.value) || 5;
    
    // Preserve existing data if possible
    const tempCrossSections = [...crossSections];
    const tempContourLines = [...contourLines];
    
    crossSections = [];
    contourLines = [];
    heights = [];
    
    for (let i = 0; i < num; i++) {
        crossSections[i] = tempCrossSections[i] || (10 * (i + 1));
        contourLines[i] = tempContourLines[i] || (i * (parseFloat(spacingInput.value) || 10));
        if (i < num - 1) {
            heights[i] = parseFloat(spacingInput.value) || 10;
        }
    }
    
    displayInputTable();
}

// Add a new row to the table
function addTableRow() {
    const newIndex = crossSections.length;
    const spacing = parseFloat(spacingInput.value) || 10;
    
    crossSections.push(10 * (newIndex + 1));
    contourLines.push(newIndex * spacing);
    if (newIndex < crossSections.length - 1) {
        heights[newIndex] = spacing;
    }
    
    displayInputTable();
    resetResults();
}

// Delete a row from the table
function deleteTableRow(index) {
    crossSections.splice(index, 1);
    contourLines.splice(index, 1);
    
    // Update heights array
    heights = [];
    for (let i = 0; i < crossSections.length - 1; i++) {
        heights[i] = parseFloat(spacingInput.value) || 10;
    }
    
    // Update numSections input
    numSectionsInput.value = crossSections.length;
    
    displayInputTable();
    resetResults();
}
function loadSampleData() {
    crossSections = [250, 200, 140, 98, 76, 40, 26, 12, 5, 0];
    contourLines = [0, 10, 20, 30, 40, 50, 60, 70, 80, 86];
    heights = [10, 10, 10, 10, 10, 10, 10, 10, 10];
    
    numSectionsInput.value = crossSections.length;
    spacingInput.value = 10;
    
    // Set reservoir properties from PDF sample
    document.getElementById('mapScale').value = 15000;
    document.getElementById('porosity').value = 25;
    document.getElementById('waterSat').value = 30;
    document.getElementById('boiFactor').value = 1.4;
    
    displayInputTable();
    resetResults();
    alert('Sample data loaded from PDF example');
}

// Handle CSV upload
function handleCsvUpload() {
    const file = csvFile.files[0];
    if (!file) {
        alert('Please select a CSV file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const csv = e.target.result;
        const lines = csv.trim().split('\n');
        
        if (lines.length < 2) {
            alert('CSV file must have at least 2 rows');
            return;
        }
        
        crossSections = [];
        heights = [];
        
        // Skip header and parse data
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 2) {
                crossSections.push(parseFloat(values[1]));
                if (i < lines.length - 1) {
                    heights.push(1.0);
                }
            }
        }
        
        numSectionsInput.value = crossSections.length;
        spacingInput.value = 1.0;
        createSectionInputs();
        
        // Update inputs with CSV values
        document.querySelectorAll('.section-input input').forEach((input, i) => {
            input.value = crossSections[i];
        });
        
        displayInputTable();
        resetResults();
        alert(`Loaded ${crossSections.length} sections from CSV`);
    };
    
    reader.readAsText(file);
}

// Get selected methods
function getSelectedMethods() {
    return ['trapezoidal', 'pyramid', 'simpson38'];
}

// Compute volume
async function compute() {
    // Validate all required inputs
    const errors = [];
    
    // Validate cross sections
    document.querySelectorAll('.section-input input').forEach((input, i) => {
        crossSections[i] = parseFloat(input.value);
        if (!input.value || isNaN(parseFloat(input.value)) || parseFloat(input.value) <= 0) {
            errors.push(`Section ${i + 1} area is missing or invalid`);
        }
    });
    
    if (crossSections.length === 0) {
        errors.push('Please enter cross-sectional data');
    }
    
    // Validate number of sections
    const numSectionsInput = document.getElementById('numSections');
    if (!numSectionsInput.value || parseInt(numSectionsInput.value) < 2) {
        errors.push('Number of Sections must be at least 2');
    }
    
    // Validate spacing/contour interval
    const spacingInput = document.getElementById('spacing');
    if (!spacingInput.value || parseFloat(spacingInput.value) <= 0) {
        errors.push('Contour Interval must be greater than 0');
    }
    
    // Validate map scale
    const mapScaleInput = document.getElementById('mapScale');
    if (!mapScaleInput.value || parseFloat(mapScaleInput.value) <= 0) {
        errors.push('Map Scale must have a valid value');
    }
    
    // Validate porosity
    const porosityInput = document.getElementById('porosity');
    if (!porosityInput.value || parseFloat(porosityInput.value) < 0 || parseFloat(porosityInput.value) > 100) {
        errors.push('Porosity must be between 0 and 100 %');
    }
    
    // Validate water saturation
    const waterSatInput = document.getElementById('waterSat');
    if (!waterSatInput.value || parseFloat(waterSatInput.value) < 0 || parseFloat(waterSatInput.value) > 100) {
        errors.push('Water Saturation must be between 0 and 100 %');
    }
    
    // Validate BOi factor
    const boiInput = document.getElementById('boiFactor');
    if (!boiInput.value || parseFloat(boiInput.value) <= 0) {
        errors.push('Oil Formation Factor must be greater than 0');
    }
    
    // If there are errors, display them and return
    if (errors.length > 0) {
        displayValidationErrors(errors);
        return;
    }
    
    const methods = getSelectedMethods();
    if (methods.length === 0) {
        displayValidationErrors(['Please select at least one formula']);
        return;
    }

    // Get reservoir properties
    const mapScale = parseFloat(document.getElementById('mapScale').value);
    const porosity = parseFloat(document.getElementById('porosity').value) / 100;
    const waterSaturation = parseFloat(document.getElementById('waterSat').value) / 100;
    const boiFactor = parseFloat(document.getElementById('boiFactor').value);
    const partialHeight = document.getElementById('partialHeight').value ? 
        parseFloat(document.getElementById('partialHeight').value) : null;
    const partialArea = document.getElementById('partialArea').value ? 
        parseFloat(document.getElementById('partialArea').value) : null;
    
    try {
        computeBtn.disabled = true;
        computeBtn.innerHTML = '<span class="spinner">⏳</span> Computing...';
        
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                crossSections,
                heights,
                methods,
                mapScale,
                porosity,
                waterSaturation,
                boiFormationVolumeFactor: boiFactor,
                partialHeight,
                partialArea
            })
        });
        
        const results = await response.json();
        
        if (response.ok) {
            lastResults = results;
            clearValidationErrors();
            hasResults = true;
            displayResults(results);
            displayInputTable();
        } else {
            displayValidationErrors([results.error || 'Computation error occurred']);
            hasResults = false;
        }
    } catch (error) {
        displayValidationErrors(['Error computing volume: ' + error.message]);
        hasResults = false;
    } finally {
        computeBtn.disabled = false;
        if (hasResults) {
            computeBtn.innerHTML = '📊 Show Result';
        } else {
            computeBtn.innerHTML = 'COMPUTE';
        }
    }
}

// Display results in modal
function displayResults(results) {
    // Store results for modal display
    lastResults = results;
    
    // Build modal content
    let modalContent = '';
    const methods = ['trapezoidal', 'pyramid', 'simpson38'];
    
    modalContent += `
        <div class="results-table-wrapper">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Bulk Volume (BV)</th>
                        <th>OOIP</th>
                        <th>OOIP (Scientific)</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    methods.forEach(method => {
        const calc = results.calculations[method];
        
        if (!calc) return;
        
        const methodName = method === 'trapezoidal' ? 'Trapezoidal Rule' : 
                          method === 'pyramid' ? 'Pyramid Rule (Simpson\'s 1/3)' : 
                          'Simpson\'s 3/8 Rule';
        
        if (calc.error) {
            modalContent += `
                <tr class="error-row">
                    <td>${methodName}</td>
                    <td colspan="3" style="color: #e74c3c; font-weight: bold;">${calc.error}</td>
                </tr>
            `;
        } else {
            const bv = (calc.bulkVolume || 0).toFixed(2);
            const ooip = (calc.ooip || 0).toFixed(2);
            const ooipSci = (calc.ooip / 1e8).toFixed(2);
            
            modalContent += `
                <tr>
                    <td><strong>${methodName}</strong></td>
                    <td>${bv} ${calc.unit}</td>
                    <td>${ooip} STB</td>
                    <td>${ooipSci} × 10⁸ STB</td>
                </tr>
            `;
            
            // Add condition row for Simpson if applicable
            if (method === 'simpson38' && calc.conditions) {
                modalContent += `
                    <tr class="condition-row">
                        <td colspan="4">
                            <strong>Simpson 3/8 Conditions:</strong>
                            Odd sections: ${calc.conditions.hasOddSections ? '✓' : '✗'} | 
                            Uniform thickness: ${calc.conditions.hasUniformThickness ? '✓' : '✗'}
                        </td>
                    </tr>
                `;
            }
        }
    });
    
    modalContent += `
                </tbody>
            </table>
        </div>
    `;
    
    // Add analysis table
    if (crossSections.length >= 2) {
        const spacing = parseFloat(document.getElementById('spacing').value) || 10;
        
        modalContent += `
            <div class="analysis-table-wrapper">
                <h3>Area Ratio Analysis (An/An-1 ≤ 0.5 Check)</h3>
                <table class="analysis-table">
                    <thead>
                        <tr>
                            <th>Contour Level Interval</th>
                            <th>An/An-1</th>
                            <th>An/An-1 ≤ 0.5</th>
                            <th>Interpretation</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (let i = 1; i < crossSections.length; i++) {
            const prevArea = crossSections[i - 1];
            const currArea = crossSections[i];
            const ratio = prevArea > 0 ? (currArea / prevArea).toFixed(2) : 0;
            const meetsCondition = parseFloat(ratio) <= 0.5;
            
            const cl1 = contourLines[i - 1] || (i - 1) * spacing;
            const cl2 = contourLines[i] || i * spacing;
            
            modalContent += `
                <tr>
                    <td>${cl1.toFixed(0)}-${cl2.toFixed(0)}</td>
                    <td>${ratio}</td>
                    <td>${meetsCondition ? '<span style="color: #27ae60; font-weight: bold;">Yes ✓</span>' : '<span style="color: #e74c3c; font-weight: bold;">No ✗</span>'}</td>
                    <td>${meetsCondition ? '<span style="color: #27ae60;">Use Pyramidal</span>' : '<span style="color: #e74c3c;">Use Trapezoidal</span>'}</td>
                </tr>
            `;
        }
        
        modalContent += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Set modal content
    document.getElementById('modalResults').innerHTML = modalContent;
    
    // Setup modal handlers
    setupModalHandlers();
    
    // Auto-show the modal
    showResultsModal();
}

// Display ratio analysis table (An/An-1 ≤ 0.5 check)
function displayRatioAnalysisTable() {
    if (crossSections.length < 2) return;
    
    let html = `
        <div class="analysis-table-wrapper">
            <h3>Area Ratio Analysis (An/An-1 ≤ 0.5 Check)</h3>
            <table class="analysis-table">
                <thead>
                    <tr>
                        <th>Contour Level Interval</th>
                        <th>An/An-1</th>
                        <th>An/An-1 ≤ 0.5</th>
                        <th>Interpretation</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    const spacing = parseFloat(document.getElementById('spacing').value) || 10;
    
    for (let i = 1; i < crossSections.length; i++) {
        const prevArea = crossSections[i - 1];
        const currArea = crossSections[i];
        const ratio = prevArea > 0 ? (currArea / prevArea).toFixed(2) : 0;
        const meetsCondition = parseFloat(ratio) <= 0.5;
        
        const cl1 = contourLines[i - 1] || (i - 1) * spacing;
        const cl2 = contourLines[i] || i * spacing;
        
        html += `
            <tr>
                <td>${cl1.toFixed(0)}-${cl2.toFixed(0)}</td>
                <td>${ratio}</td>
                <td>${meetsCondition ? '<span style="color: #27ae60; font-weight: bold;">Yes ✓</span>' : '<span style="color: #e74c3c; font-weight: bold;">No ✗</span>'}</td>
                <td>${meetsCondition ? '<span style="color: #27ae60;">Use Pyramidal</span>' : '<span style="color: #e74c3c;">Use Trapezoidal</span>'}</td>
            </tr>
        `;
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    resultsDiv.innerHTML += html;
}

// Show results modal
function showResultsModal() {
    const modal = document.getElementById('resultsModal');
    modal.classList.add('show');
}

// Close results modal
function closeResultsModal() {
    const modal = document.getElementById('resultsModal');
    modal.classList.remove('show');
}

// Setup modal event handlers
function setupModalHandlers() {
    const modal = document.getElementById('resultsModal');
    const closeBtn = modal.querySelector('.modal-close');
    
    // Close X button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeResultsModal);
    }
    
    // Close when clicking outside modal
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeResultsModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeResultsModal();
        }
    });
}

// Display analysis table
function displayAnalysisTable() {
    if (crossSections.length < 2) return;
    
    let html = `
        <div class="analysis-table-wrapper">
            <h3>Pyramid Method Analysis (An/An-1 ≤ 0.5 Check)</h3>
            <table class="analysis-table">
                <thead>
                    <tr>
                        <th>Contour Interval</th>
                        <th>An/An-1</th>
                        <th>An/An-1 ≤ 0.5</th>
                        <th>Interpretation</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    const spacing = parseFloat(document.getElementById('spacing').value) || 10;
    
    for (let i = 1; i < crossSections.length; i++) {
        const prevArea = crossSections[i - 1];
        const currArea = crossSections[i];
        const ratio = prevArea > 0 ? (currArea / prevArea) : 0;
        const meetsCondition = ratio <= 0.5;
        
        const cl1 = contourLines[i - 1] || (i - 1) * spacing;
        const cl2 = contourLines[i] || i * spacing;
        
        html += `
            <tr>
                <td>${cl1.toFixed(0)} - ${cl2.toFixed(0)}</td>
                <td>${ratio.toFixed(2)}</td>
                <td>${meetsCondition ? '<span style="color: #27ae60; font-weight: bold;">Yes ✓</span>' : '<span style="color: #e74c3c; font-weight: bold;">No ✗</span>'}</td>
                <td>${meetsCondition ? 'Use Pyramid' : 'Use Trapezoidal'}</td>
            </tr>
        `;
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    resultsDiv.innerHTML += html;
}

function updateCharts() {
    if (!lastResults || !lastResults.calculations) return;
    
    const ctx1 = document.getElementById('areaChart').getContext('2d');
    const ctx2 = document.getElementById('comparisonChart').getContext('2d');
    
    // Destroy existing charts
    if (areaChart) areaChart.destroy();
    if (comparisonChart) comparisonChart.destroy();
    
    // Area chart
    const areasToDisplay = lastResults.unitConversions ? 
        lastResults.unitConversions.areasInAcres.map(a => parseFloat(a)) : 
        crossSections;
    
    areaChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: crossSections.map((_, i) => `Section ${i + 1}`),
            datasets: [{
                label: 'Cross-sectional Area (acres)',
                data: areasToDisplay,
                backgroundColor: '#000',
                borderColor: '#000',
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Comparison chart - show only selected formula's volume
    const calc = lastResults.calculations[selectedFormula];
    const methodName = selectedFormula === 'trapezoidal' ? 'Trapezoidal' : 
                       selectedFormula === 'pyramid' ? 'Pyramid' : 'Simpson\'s 3/8';
    
    comparisonChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: [methodName],
            datasets: [{
                label: 'Bulk Volume (acre-ft)',
                data: [calc && calc.bulkVolume ? calc.bulkVolume : 0],
                backgroundColor: ['#000'],
                borderColor: ['#000'],
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


// Display validation errors
function displayValidationErrors(errors) {
    const resultsDiv = document.getElementById('results');
    let errorHtml = '<div class="error-container">';
    errorHtml += '<div class="error-title">⚠ Validation Errors:</div>';
    errorHtml += '<ul class="error-list">';
    errors.forEach(error => {
        errorHtml += `<li>${error}</li>`;
    });
    errorHtml += '</ul></div>';
    resultsDiv.innerHTML = errorHtml;
}

// Clear validation errors
function clearValidationErrors() {
    const resultsDiv = document.getElementById('results');
    const errorContainer = resultsDiv.querySelector('.error-container');
    if (errorContainer) {
        errorContainer.remove();
    }
}

// Display input data table
function displayInputTable() {
    const inputTable = document.getElementById('inputTable');
    if (!inputTable || crossSections.length === 0) return;
    
    let html = `
        <thead>
            <tr>
                <th>C.L</th>
                <th>Area (inch²)</th>
                <th style="text-align: center;">Action</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    crossSections.forEach((area, i) => {
        html += `
            <tr>
                <td>
                    <input type="number" 
                           class="table-input cl-input" 
                           data-index="${i}" 
                           value="${contourLines[i] ? contourLines[i].toFixed(0) : i}" 
                           step="0.1" 
                           min="0">
                </td>
                <td>
                    <input type="number" 
                           class="table-input area-input" 
                           data-index="${i}" 
                           value="${area.toFixed(0)}" 
                           step="0.1" 
                           min="0">
                </td>
                <td style="text-align: center;">
                    <button class="delete-btn" data-index="${i}" title="Delete row">✕</button>
                </td>
            </tr>
        `;
    });
    
    html += `
        </tbody>
    `;
    
    inputTable.innerHTML = html;
    
    // Add event listeners to C.L inputs
    document.querySelectorAll('.cl-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            const value = parseFloat(this.value);
            if (!isNaN(value) && value >= 0) {
                contourLines[index] = value;
            } else {
                this.value = (contourLines[index] || index).toFixed(0);
            }
            resetResults();
        });
        
        input.addEventListener('blur', function() {
            const index = parseInt(this.dataset.index);
            this.value = (contourLines[index] || index).toFixed(0);
        });
    });
    
    // Add event listeners to Area inputs
    document.querySelectorAll('.area-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            const value = parseFloat(this.value);
            if (!isNaN(value) && value >= 0) {
                crossSections[index] = value;
            } else {
                this.value = crossSections[index].toFixed(0);
            }
            resetResults();
        });
        
        input.addEventListener('blur', function() {
            const index = parseInt(this.dataset.index);
            this.value = crossSections[index].toFixed(0);
        });
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            deleteTableRow(index);
        });
    });
}

// Initialize on page load
window.addEventListener('load', () => {
    createHiddenCheckboxes();
    initializeTable();
});
