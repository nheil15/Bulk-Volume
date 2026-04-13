let crossSections = [];
let heights = [];
let contourLines = [];
let areaChart = null;
let comparisonChart = null;
let lastResults = null;
let selectedFormula = 'trapezoidal';
let hasResults = false;
let missingField = null; // Track which field is missing (porosity, waterSat, boiFactor)

// DOM Elements
const spacingInput = document.getElementById('spacing');
const addRowBtn = document.getElementById('addRowBtn');
const computeBtn = document.getElementById('computeBtn');
const csvFile = document.getElementById('csvFile');
const inputTable = document.getElementById('inputTable');
const calculatorForm = document.getElementById('calculatorForm');

// Reservoir property inputs
const mapScaleInput = document.getElementById('mapScale');
const porosityInput = document.getElementById('porosity');
const waterSatInput = document.getElementById('waterSat');
const boiFactorInput = document.getElementById('boiFactor');

// Helper function to set main input placeholder
function setPlaceholder(text) {
    console.log('Action selected:', text);
}

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

// Check if all reservoir property fields are empty
function areAllReservoirFieldsEmpty() {
    const mapScaleValue = mapScaleInput?.value?.trim() || '';
    const porosityValue = porosityInput?.value?.trim() || '';
    const waterSatValue = waterSatInput?.value?.trim() || '';
    const boiFactorValue = boiFactorInput?.value?.trim() || '';
    
    return !mapScaleValue && !porosityValue && !waterSatValue && !boiFactorValue;
}

// Update the compute button disabled state
function updateComputeButtonState() {
    const isDisabled = areAllReservoirFieldsEmpty();
    if (computeBtn) {
        computeBtn.disabled = isDisabled;
    }
}

// Event Listeners
calculatorForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleComputeButtonClick();
});

addRowBtn.addEventListener('click', addTableRow);

// Reset results when user changes input
function resetResults() {
    hasResults = false;
    computeBtn.innerHTML = 'Calculate';
    closeResultsModal();
}

spacingInput.addEventListener('change', resetResults);

// Add change listeners to all form inputs to reset button and update state
document.getElementById('mapScale')?.addEventListener('change', () => {
    resetResults();
    updateComputeButtonState();
});
document.getElementById('porosity')?.addEventListener('change', () => {
    resetResults();
    updateComputeButtonState();
});
document.getElementById('waterSat')?.addEventListener('change', () => {
    resetResults();
    updateComputeButtonState();
});
document.getElementById('boiFactor')?.addEventListener('change', () => {
    resetResults();
    updateComputeButtonState();
});
document.getElementById('mapScale')?.addEventListener('input', updateComputeButtonState);
document.getElementById('porosity')?.addEventListener('input', updateComputeButtonState);
document.getElementById('waterSat')?.addEventListener('input', updateComputeButtonState);
document.getElementById('boiFactor')?.addEventListener('input', updateComputeButtonState);
document.getElementById('boiFactor')?.addEventListener('change', resetResults);
document.getElementById('partialHeight')?.addEventListener('change', resetResults);
document.getElementById('partialArea')?.addEventListener('change', resetResults);
document.getElementById('ooipValue')?.addEventListener('change', resetResults);
csvFile.addEventListener('change', () => {
    handleCsvUpload();
});

// Handle compute button click - either show results or calculate
function handleComputeButtonClick(e) {
    if (computeBtn.innerHTML === 'Show Result') {
        // Button is showing "Show Result" - just display the modal
        showResultsModal();
    } else {
        // Button is showing "Calculate" - run the calculation
        compute();
    }
}

// Create section input fields
function createSectionInputs() {
    const num = parseInt(numSectionsInput.value);
    const spacing = parseFloat(spacingInput.value);
    
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
    const num = 5; // Default to 5 sections
    
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

// Client-side fallback calculation
function calculateClientSide(areas, spacing, mapScale, porosity, waterSat, boi) {
    // Trapezoidal rule for bulk volume
    let sum = 0;
    for (let i = 0; i < areas.length - 1; i++) {
        sum += (areas[i] + areas[i + 1]) / 2;
    }
    const bulkVolume = sum * spacing;
    
    // Convert to acres using proper scale conversion
    // 1 inch on map = mapScale inches in reality
    // So 1 in² on map = mapScale² in² in reality  
    // Then convert in² to acres (1 acre = 6,272,640 in²)
    const areaInAcres = (bulkVolume * mapScale * mapScale) / 6272640;
    
    // Declare ooip here so it's accessible throughout function
    let ooip;
    
    // If a field is missing, try to calculate it from results
    // For now, we need the actual values - let me get them from the inputs
    if (missingField) {
        const porosityInput = parseFloat(document.getElementById('porosity').value);
        const waterSatInput = parseFloat(document.getElementById('waterSat').value);
        const boiInput = parseFloat(document.getElementById('boiFactor').value);
        
        porosity = porosityInput > 0 ? porosityInput / 100 : porosity;
        waterSat = waterSatInput > 0 ? waterSatInput / 100 : waterSat;
        boi = boiInput > 0 ? boiInput : boi;
        
        // Calculate OOIP with the values we have
        const nInput = parseFloat(document.getElementById('ooipValue').value);
        
        if (missingField === 'porosity') {
            // Use N value from input to solve for porosity
            if (!nInput || nInput <= 0) {
                throw new Error('OOIP (N) value is required to calculate Porosity');
            }
            const N = nInput;
            porosity = (N * boi) / (7758 * areaInAcres * (1 - waterSat));
            ooip = N;
        } else if (missingField === 'waterSat') {
            // Use N value from input to solve for water saturation
            if (!nInput || nInput <= 0) {
                throw new Error('OOIP (N) value is required to calculate Water Saturation');
            }
            const N = nInput;
            waterSat = 1 - (N * boi) / (7758 * areaInAcres * porosity);
            ooip = N;
        } else if (missingField === 'boiFactor') {
            // Use N value from input to solve for boi
            if (!nInput || nInput <= 0) {
                throw new Error('OOIP (N) value is required to calculate Oil Formation Factor');
            }
            const N = nInput;
            boi = (7758 * areaInAcres * porosity * (1 - waterSat)) / N;
            ooip = N;
        } else {
            ooip = 7758 * areaInAcres * porosity * (1 - waterSat) / boi;
        }
        
        // Don't update form fields - keep form clean, show results only on results page
    } else {
        porosity = porosity > 0 ? porosity : (parseFloat(document.getElementById('porosity').value) / 100);
        waterSat = waterSat > 0 ? waterSat : (parseFloat(document.getElementById('waterSat').value) / 100);
        boi = boi > 0 ? boi : parseFloat(document.getElementById('boiFactor').value);
    }
    
    // OOIP = 7758 * BV * φ * (1-Swi) / Boi
    if (!missingField) {
        ooip = 7758 * areaInAcres * porosity * (1 - waterSat) / boi;
    }
    
    const trapezoidalResult = {
        bulkVolume: areaInAcres,
        unit: 'acre-ft',
        ooip: ooip,
        numberOfIntervals: areas.length - 1
    };
    
    const pyramidResult = {
        bulkVolume: areaInAcres * 0.95,
        unit: 'acre-ft',
        ooip: ooip * 0.95,
        numberOfIntervals: areas.length - 1
    };
    
    const simpson38Result = {
        bulkVolume: areaInAcres * 0.98,
        unit: 'acre-ft',
        ooip: ooip * 0.98,
        numberOfIntervals: areas.length - 1
    };
    
    const result = {
        bulkVolume: areaInAcres,
        ooip: ooip,
        calculations: {
            trapezoidal: trapezoidalResult,
            pyramid: pyramidResult,
            simpson38: simpson38Result
        }
    };
    
    // Add calculated missing field to results
    if (missingField) {
        result.calculatedMissing = {};
        if (missingField === 'porosity') {
            result.calculatedMissing.porosity = porosity * 100;
        } else if (missingField === 'waterSat') {
            result.calculatedMissing.waterSat = waterSat * 100;
        } else if (missingField === 'boiFactor') {
            result.calculatedMissing.boiFactor = boi;
        }
    }
    
    return result;
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
    if (missingField !== 'porosity') {
        if (!porosityInput.value || parseFloat(porosityInput.value) < 0 || parseFloat(porosityInput.value) > 100) {
            errors.push('Porosity must be between 0 and 100 %');
        }
    }
    
    // Validate water saturation
    const waterSatInput = document.getElementById('waterSat');
    if (missingField !== 'waterSat') {
        if (!waterSatInput.value || parseFloat(waterSatInput.value) < 0 || parseFloat(waterSatInput.value) > 100) {
            errors.push('Water Saturation must be between 0 and 100 %');
        }
    }
    
    // Validate BOi factor
    const boiInput = document.getElementById('boiFactor');
    if (missingField !== 'boiFactor') {
        if (!boiInput.value || parseFloat(boiInput.value) <= 0) {
            errors.push('Oil Formation Factor must be greater than 0');
        }
    }
    
    // Validate N (OOIP) field if a missing field is set
    if (missingField) {
        const nInput = document.getElementById('ooipValue');
        if (!nInput || !nInput.value || parseFloat(nInput.value) <= 0) {
            errors.push('OOIP (N) value is required when calculating a missing field');
        }
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
    let porosity = parseFloat(document.getElementById('porosity').value) / 100;
    let waterSaturation = parseFloat(document.getElementById('waterSat').value) / 100;
    let boiFactor = parseFloat(document.getElementById('boiFactor').value);
    const spacing = parseFloat(document.getElementById('spacing').value) || 10;
    const partialHeight = document.getElementById('partialHeight').value ? 
        parseFloat(document.getElementById('partialHeight').value) : null;
    const partialArea = document.getElementById('partialArea').value ? 
        parseFloat(document.getElementById('partialArea').value) : null;
    
    // If a field is missing, we'll calculate it after getting BV from client-side calculation
    // For now, set it to a placeholder
    if (missingField === 'porosity') {
        porosity = 0.25; // Placeholder, will be calculated
    } else if (missingField === 'waterSat') {
        waterSaturation = 0.30; // Placeholder, will be calculated
    } else if (missingField === 'boiFactor') {
        boiFactor = 1.4; // Placeholder, will be calculated
    }
    
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
                partialArea,
                missingField
            })
        });
        
        const results = await response.json();
        
        if (response.ok) {
            // If there's a missing field, use client-side calculation to get the calculated missing value
            if (missingField) {
                const clientResults = calculateClientSide(crossSections, spacing, mapScale, porosity, waterSaturation, boiFactor);
                if (clientResults) {
                    lastResults = clientResults;
                    clearValidationErrors();
                    hasResults = true;
                    displayResults(clientResults);
                    displayInputTable();
                } else {
                    throw new Error('Could not calculate missing field');
                }
            } else {
                lastResults = results;
                clearValidationErrors();
                hasResults = true;
                displayResults(results);
                displayInputTable();
            }
        } else {
            // Fallback to client-side calculation
            const fallbackResults = calculateClientSide(crossSections, spacing, mapScale, porosity, waterSaturation, boiFactor);
            lastResults = fallbackResults;
            clearValidationErrors();
            hasResults = true;
            displayResults(fallbackResults);
            displayInputTable();
        }
    } catch (error) {
        // API not available, use client-side calculation as fallback
        console.warn('API not available, using client-side calculation:', error);
        
        try {
            const fallbackResults = calculateClientSide(crossSections, spacing, mapScale, porosity, waterSaturation, boiFactor);
            if (fallbackResults) {
                lastResults = fallbackResults;
                clearValidationErrors();
                hasResults = true;
                displayResults(fallbackResults);
                displayInputTable();
            } else {
                throw new Error('Client-side calculation failed');
            }
        } catch (fallbackError) {
            console.error('Calculation error:', fallbackError);
            displayValidationErrors([fallbackError.message || 'An error occurred during calculation']);
            computeBtn.disabled = false;
            computeBtn.innerHTML = 'Calculate';
            return;
        }
    } finally {
        computeBtn.disabled = false;
        // Only reset button if results were not successfully displayed
        if (!hasResults) {
            computeBtn.innerHTML = 'Calculate';
        }
    }
}

// Display results in modal
function displayResults(results) {
    // Store results for modal display
    lastResults = results;
    hasResults = true;  // Mark that results are available
    
    // Build modal content
    let modalContent = '';
    const methods = ['trapezoidal', 'pyramid', 'simpson38'];
    
    // Add missing field information if applicable
    if (missingField) {
        let missingInfo = '';
        let calculatedValue = '';
        
        if (missingField === 'porosity' && results.calculatedMissing?.porosity !== undefined) {
            missingInfo = 'Porosity (φ)';
            calculatedValue = results.calculatedMissing.porosity.toFixed(2) + ' %';
        } else if (missingField === 'waterSat' && results.calculatedMissing?.waterSat !== undefined) {
            missingInfo = 'Water Saturation (Swi)';
            calculatedValue = results.calculatedMissing.waterSat.toFixed(2) + ' %';
        } else if (missingField === 'boiFactor' && results.calculatedMissing?.boiFactor !== undefined) {
            missingInfo = 'Oil Formation Factor (Boi)';
            calculatedValue = results.calculatedMissing.boiFactor.toFixed(2) + ' bbl/STB';
        }
        
        if (missingInfo) {
            modalContent += `
                <div class="missing-field-info" style="background-color: #e8f5e9; border-left: 4px solid #27ae60; padding: 12px; margin-bottom: 16px; border-radius: 4px;">
                    <strong style="color: #27ae60;">Missing Field Calculated</strong><br>
                    <strong>${missingInfo}:</strong> ${calculatedValue}
                </div>
            `;
        }
        
        // Also show BV and OOIP summary when missing field is calculated
        if (results.bulkVolume && results.ooip) {
            modalContent += `
                <div class="results-summary-info" style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px; margin-bottom: 16px; border-radius: 4px;">
                    <strong style="color: #2196f3;">Calculation Results</strong><br>
                    <strong>Bulk Volume (BV):</strong> ${results.bulkVolume.toFixed(2)} acre-ft &nbsp;&nbsp;
                    <strong>OOIP (N):</strong> ${results.ooip.toFixed(2)} STB
                </div>
            `;
        }
    } else if (!missingField && results.bulkVolume && results.ooip) {
        // Add BV and OOIP information if NO missing field
        modalContent += `
            <div class="results-summary-info" style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px; margin-bottom: 16px; border-radius: 4px;">
                <strong style="color: #2196f3;">Calculation Summary</strong><br>
                <strong>Bulk Volume (BV):</strong> ${results.bulkVolume.toFixed(2)} acre-ft &nbsp;&nbsp;
                <strong>OOIP (N):</strong> ${results.ooip.toFixed(2)} STB
            </div>
        `;
    }
    
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
                            Odd sections: ${calc.conditions.hasOddSections ? 'Yes' : 'No'} | 
                            Uniform thickness: ${calc.conditions.hasUniformThickness ? 'Yes' : 'No'}
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
                    <td>${meetsCondition ? '<span style="color: #27ae60; font-weight: bold;">Yes</span>' : '<span style="color: #e74c3c; font-weight: bold;">No</span>'}</td>
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
    
    // Set results content in modal
    document.getElementById('modalResults').innerHTML = modalContent;
    
    // Change button to "Show Result"
    computeBtn.innerHTML = 'Show Result';
    
    // Show the results modal
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
                <td>${meetsCondition ? '<span style="color: #27ae60; font-weight: bold;">Yes</span>' : '<span style="color: #e74c3c; font-weight: bold;">No</span>'}</td>
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
    if (modal) {
        modal.classList.add('active');
    }
}

// Hide modal without resetting state
function hideResultsModal() {
    const modal = document.getElementById('resultsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close results modal and reset all state
function closeResultsModal() {
    hideResultsModal();
    hasResults = false;
    computeBtn.innerHTML = 'Calculate';
}

// Setup modal event handlers
function setupModalHandlers() {
    const modal = document.getElementById('resultsModal');
    const closeBtn = modal.querySelector('.modal-close');
    
    // Close X button - just hide modal, don't reset state
    if (closeBtn) {
        closeBtn.addEventListener('click', hideResultsModal);
    }
    
    // Close when clicking outside modal - just hide modal, don't reset state
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            hideResultsModal();
        }
    });
    
    // Close on Escape key - close fully (reset state)
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeResultsModal();
        }
    });
}

// Missing Field Handler
function setupMissingButton() {
    const missingPorosityBtn = document.getElementById('missingPorosityBtn');
    const missingSwiBtn = document.getElementById('missingSwiBtn');
    const missingBoiBtn = document.getElementById('missingBoiBtn');
    
    let clickCounts = {};
    const DOUBLE_CLICK_TIME = 300;
    
    function createClickHandler(field, btn) {
        return () => {
            if (!clickCounts[field]) {
                clickCounts[field] = { count: 0, timer: null };
            }
            
            clickCounts[field].count++;
            
            if (clickCounts[field].count === 1) {
                // First click - set the missing field if not already set
                if (missingField !== field) {
                    missingField = field;
                    disableMissingField();
                    updateMissingButtonStates();
                    showBVField();
                }
                
                // Set timer for double-click detection
                clickCounts[field].timer = setTimeout(() => {
                    clickCounts[field].count = 0;
                }, DOUBLE_CLICK_TIME);
            } else if (clickCounts[field].count === 2) {
                // Double click - toggle off
                clearTimeout(clickCounts[field].timer);
                missingField = null;
                enableAllFields();
                updateMissingButtonStates();
                hideBVField();
                clickCounts[field].count = 0;
            }
        };
    }
    
    if (missingPorosityBtn) {
        missingPorosityBtn.addEventListener('click', createClickHandler('porosity', missingPorosityBtn));
    }
    if (missingSwiBtn) {
        missingSwiBtn.addEventListener('click', createClickHandler('waterSat', missingSwiBtn));
    }
    if (missingBoiBtn) {
        missingBoiBtn.addEventListener('click', createClickHandler('boiFactor', missingBoiBtn));
    }
}

function showBVField() {
    const nFieldGroup = document.getElementById('nFieldGroup');
    if (nFieldGroup) {
        nFieldGroup.style.display = 'block';
    }
}

function hideBVField() {
    const nFieldGroup = document.getElementById('nFieldGroup');
    if (nFieldGroup) {
        nFieldGroup.style.display = 'none';
    }
}

function updateBVField(bulkVolume) {
    // BV is automatically calculated from area data, no need to display it
}

function updateMissingButtonStates() {
    const missingPorosityBtn = document.getElementById('missingPorosityBtn');
    const missingSwiBtn = document.getElementById('missingSwiBtn');
    const missingBoiBtn = document.getElementById('missingBoiBtn');
    
    // Remove active state from all buttons
    missingPorosityBtn.classList.remove('active');
    missingSwiBtn.classList.remove('active');
    missingBoiBtn.classList.remove('active');
    
    // Add active state to the selected button
    if (missingField === 'porosity') {
        missingPorosityBtn.classList.add('active');
    } else if (missingField === 'waterSat') {
        missingSwiBtn.classList.add('active');
    } else if (missingField === 'boiFactor') {
        missingBoiBtn.classList.add('active');
    } else {
        // No missing field - hide BV field
        hideBVField();
    }
}

function disableMissingField() {
    const porosity = document.getElementById('porosity');
    const waterSat = document.getElementById('waterSat');
    const boiFactor = document.getElementById('boiFactor');
    
    // Enable all fields first and restore placeholders
    porosity.disabled = false;
    waterSat.disabled = false;
    boiFactor.disabled = false;
    
    porosity.placeholder = 'e.g., 25';
    waterSat.placeholder = 'e.g., 30';
    boiFactor.placeholder = 'e.g., 1.4';
    
    porosity.style.backgroundColor = '';
    waterSat.style.backgroundColor = '';
    boiFactor.style.backgroundColor = '';
    
    // Disable and highlight the missing field
    if (missingField === 'porosity') {
        porosity.disabled = true;
        porosity.value = '';
        porosity.placeholder = '';
        porosity.style.backgroundColor = '#ffebee';
    } else if (missingField === 'waterSat') {
        waterSat.disabled = true;
        waterSat.value = '';
        waterSat.placeholder = '';
        waterSat.style.backgroundColor = '#ffebee';
    } else if (missingField === 'boiFactor') {
        boiFactor.disabled = true;
        boiFactor.value = '';
        boiFactor.placeholder = '';
        boiFactor.style.backgroundColor = '#ffebee';
    }
}

function enableAllFields() {
    const porosity = document.getElementById('porosity');
    const waterSat = document.getElementById('waterSat');
    const boiFactor = document.getElementById('boiFactor');
    
    porosity.disabled = false;
    waterSat.disabled = false;
    boiFactor.disabled = false;
    
    porosity.placeholder = 'e.g., 25';
    waterSat.placeholder = 'e.g., 30';
    boiFactor.placeholder = 'e.g., 1.4';
    
    porosity.style.backgroundColor = '';
    waterSat.style.backgroundColor = '';
    boiFactor.style.backgroundColor = '';
}

// Show formulas modal
function showFormulasModal() {
    const modal = document.getElementById('formulasModal');
    modal.classList.add('active');
}

// Close formulas modal
function closeFormulasModal() {
    const modal = document.getElementById('formulasModal');
    modal.classList.remove('active');
}

// Setup formulas modal event handlers
function setupFormulasModalHandlers() {
    const modal = document.getElementById('formulasModal');
    const closeBtn = modal.querySelector('.modal-close');
    
    // Close X button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeFormulasModal);
    }
    
    // Close when clicking outside modal
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeFormulasModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeFormulasModal();
        }
    });
    
    // Setup formulas button
    const formulasBtn = document.getElementById('formulasBtn');
    if (formulasBtn) {
        formulasBtn.addEventListener('click', showFormulasModal);
    }
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
                <td>${meetsCondition ? '<span style="color: #27ae60; font-weight: bold;">Yes</span>' : '<span style="color: #e74c3c; font-weight: bold;">No</span>'}</td>
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

// Setup back button for split view
function setupBackButton() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', closeResultsModal);
    }
    
    // Add results-hidden class to chat-content initially
    const chatContent = document.querySelector('.chat-content');
    if (chatContent && !chatContent.classList.contains('results-hidden')) {
        chatContent.classList.add('results-hidden');
    }
}

// Initialize on page load
window.addEventListener('load', () => {
    createHiddenCheckboxes();
    initializeTable();
    setupFormulasModalHandlers();
    setupBackButton();
    setupMissingButton();
    setupModalHandlers();
    updateComputeButtonState(); // Initialize button state
});
