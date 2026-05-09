let crossSections = [];
let heights = [];
let contourLines = [];
let zoneSelections = []; // Store zone selection for each contour level
let areaChart = null;
let comparisonChart = null;
let lastResults = null;
let selectedFormula = 'trapezoidal';
let hasResults = false;
let usedMethodsInCurrentTable = new Set(); // Track which methods are used in the current table

// DOM Elements - will be initialized after page loads
let spacingInput;
let addRowBtn;
let computeBtn;
let csvFile;
let inputTable;
let calculatorForm;
let mapScaleInput;
let porosityInput;
let boiFactorInput;

// Initialize DOM elements after page load
function initializeDOMElements() {
    spacingInput = document.getElementById('spacing');
    addRowBtn = document.getElementById('addRowBtn');
    computeBtn = document.getElementById('computeBtn');
    csvFile = document.getElementById('csvFile');
    inputTable = document.getElementById('inputTable');
    calculatorForm = document.getElementById('calculatorForm');
    mapScaleInput = document.getElementById('mapScale');
    porosityInput = document.getElementById('porosity');
    boiFactorInput = document.getElementById('boiFactor');

    const oilSatOilInput = document.getElementById('oilSatOil');
    const gasSatGasInput = document.getElementById('gasSatGas');
    const oilSatGasInput = document.getElementById('oilSatGas');

    if (oilSatOilInput) {
        oilSatOilInput.autocomplete = 'off';
        oilSatOilInput.value = '';
    }
    if (gasSatGasInput) {
        gasSatGasInput.autocomplete = 'off';
        gasSatGasInput.value = '';
    }
    if (oilSatGasInput) {
        oilSatGasInput.autocomplete = 'off';
        oilSatGasInput.value = '';
    }
}

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
        `;
        document.body.insertAdjacentHTML('afterbegin', checkboxes);
    }
};

// Check if all reservoir property fields are empty
function areAllReservoirFieldsEmpty() {
    const mapScaleValue = mapScaleInput?.value?.trim() || '';
    const porosityValue = porosityInput?.value?.trim() || '';
    const boiFactorValue = boiFactorInput?.value?.trim() || '';
    
    return !mapScaleValue && !porosityValue && !boiFactorValue;
}

// Return an array of missing required field messages (empty if none)
function getMissingRequiredFields() {
    const missing = [];

    // Area inputs
    const areaInputs = Array.from(document.querySelectorAll('.area-input'));
    if (areaInputs.length === 0) {
        missing.push('Enter cross-sectional area data in the Input Summary table.');
    } else {
        const anyEmpty = areaInputs.some(inp => !inp.value || Number.isNaN(parseFloat(inp.value)));
        if (anyEmpty) missing.push('All area values in the Input Summary table must be filled with valid numbers.');
    }

    // Spacing
    const sp = document.getElementById('spacing');
    if (!sp || !sp.value || parseFloat(sp.value) <= 0) {
        missing.push('Provide a valid Contour Interval (spacing).');
    }

    // Map scale
    const ms = document.getElementById('mapScale');
    if (!ms || !ms.value || parseFloat(ms.value) <= 0) {
        missing.push('Provide a valid Map Scale (1:X).');
    }

    // Porosity
    const por = document.getElementById('porosity');
    if (!por || !por.value || parseFloat(por.value) < 0 || parseFloat(por.value) > 100) {
        missing.push('Provide Porosity (0-100%).');
    }

    // Boi
    const boi = document.getElementById('boiFactor');
    if (!boi || !boi.value || parseFloat(boi.value) <= 0) {
        missing.push('Provide Oil Formation Factor (Boi) greater than 0.');
    }

    // Partial thickness - at least one required
    const hGOC = document.getElementById('partialHeightGOC');
    const hBot = document.getElementById('partialHeightBottom');
    const hasH = (hGOC && hGOC.value) || (hBot && hBot.value);
    if (!hasH) {
        missing.push("Specify at least one partial thickness: 'Partial Thickness at GOC' or 'Partial Thickness at Bottom'.");
    }

    return missing;
}

// Update the compute button disabled state
function updateComputeButtonState() {
    // Do not show live errors while the user is editing. Clear any existing inline errors
    // and keep the compute button enabled so the user can press Calculate to validate.
    const formErrors = document.getElementById('formErrors');
    if (formErrors) {
        formErrors.innerHTML = '';
    }
    if (computeBtn) {
        computeBtn.disabled = false;
    }
}

// Render form errors inline (used when user presses Calculate)
function showFormErrors(missing) {
    if (!missing || missing.length === 0) return;
    let formErrors = document.getElementById('formErrors');
    if (!formErrors) {
        formErrors = document.createElement('div');
        formErrors.id = 'formErrors';
        formErrors.className = 'form-errors';
        if (computeBtn && computeBtn.parentElement) {
            computeBtn.parentElement.insertBefore(formErrors, computeBtn);
        } else if (calculatorForm) {
            calculatorForm.appendChild(formErrors);
        }
    }
    formErrors.innerHTML = '<ul>' + missing.map(m => `<li>${m}</li>`).join('') + '</ul>';
}

// Reset results when user changes input
function resetResults() {
    hasResults = false;
    computeBtn.innerHTML = 'Calculate';
    closeResultsModal();
}

// Handle compute button click - either show results or calculate
function handleComputeButtonClick(e) {
    // Validate required fields now (show errors only when user presses Calculate)
    const missing = getMissingRequiredFields();
    if (missing.length > 0 && computeBtn.innerHTML !== 'Show Result') {
        showValidationModal(missing);
        return;
    }

    if (computeBtn.innerHTML === 'Show Result') {
        // Button is showing "Show Result" - just display the modal
        showResultsModal();
    } else {
        // Button is showing "Calculate" - run the calculation
        compute();
    }
}

// Show validation errors in the results modal when Calculate is pressed
function showValidationModal(missing) {
    if (!missing || missing.length === 0) return;
    const modal = document.getElementById('resultsModal');
    const modalHeader = modal ? modal.querySelector('.modal-header h2') : null;
    const modalBody = document.getElementById('modalResults');

    if (modalHeader) {
        modalHeader.textContent = '⚠ Validation Errors';
    }

    if (modalBody) {
        modalBody.innerHTML = `
            <div class="form-errors" style="background:#fff3f2;border-color:#f5c6cb;color:#a94442;">
                <p>Please provide the following before calculation:</p>
                <ul>${missing.map(m => `<li>${m}</li>`).join('')}</ul>
            </div>
        `;
    }

    if (modal) {
        modal.classList.add('active');
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
        crossSections[i] = ''; // Empty by default, user must enter
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
    
    crossSections = [];
    contourLines = [];
    heights = [];
    
    // Get spacing value safely with fallback
    const spacing = spacingInput ? parseFloat(spacingInput.value) || 10 : 10;
    
    for (let i = 0; i < num; i++) {
        crossSections[i] = ''; // Empty by default, user must enter
        contourLines[i] = i * spacing;
        if (i < num - 1) {
            heights[i] = spacing;
        }
    }
    
    displayInputTable();
}

// Add a new row to the table
function addTableRow() {
    // First, save any current input values from the DOM
    document.querySelectorAll('.area-input').forEach(input => {
        const index = parseInt(input.dataset.index);
        const value = input.value.trim();
        if (value) {
            crossSections[index] = parseFloat(value);
        }
    });
    
    const newIndex = crossSections.length;
    const spacing = parseFloat(spacingInput.value) || 10;
    
    crossSections.push(''); // Add empty row for user to fill in
    contourLines.push(newIndex * spacing);
    zoneSelections.push('oil'); // Default new rows to oil zone
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
    zoneSelections.splice(index, 1);
    
    // Update heights array
    heights = [];
    for (let i = 0; i < crossSections.length - 1; i++) {
        heights[i] = parseFloat(spacingInput.value) || 10;
    }
    
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
        zoneSelections = [];
        
        // Skip header and parse data
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 2) {
                crossSections.push(parseFloat(values[1]));
                zoneSelections.push('oil'); // Default to oil zone
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
    return ['trapezoidal'];
}

// Calculate bulk volume by interval with appropriate method selection
function calculateBulkVolumeByInterval(areas, contourLevels, zoneSelections, zoneName) {
    if (areas.length < 2 || contourLevels.length < 2) return 0;
    
    let totalBV = 0;
    
    // Process each interval
    for (let i = 0; i < areas.length - 1; i++) {
        // Check if this interval belongs to the specified zone
        if (zoneSelections && zoneSelections[i] !== zoneName) {
            continue;
        }
        
        const a_n = areas[i];
        const a_n1 = areas[i + 1];
        const ratio = a_n1 / a_n;
        // Calculate ACTUAL spacing between this pair of contours
        const h = contourLevels[i + 1] - contourLevels[i];
        
        let intervalBV = 0;
        
        // Select method based on area ratio
        if (ratio <= 0.5) {
            // Use Pyramidal method: BV = (h/3) × [A_i + A_{i+1} + √(A_i × A_{i+1})]
            const geometricMean = Math.sqrt(a_n * a_n1);
            intervalBV = (h / 3) * (a_n + a_n1 + geometricMean);
        } else {
            // Use Trapezoidal method: BV = (h/2) × [A_i + A_{i+1}]
            intervalBV = (h / 2) * (a_n + a_n1);
        }
        
        totalBV += intervalBV;
    }
    
    return totalBV;
}

// Convert a mapped area in square inches to acres using the map scale.
function convertMapAreaToAcres(areaInSquareInches, mapScale) {
    return (areaInSquareInches * mapScale * mapScale) / 6272640;
}

// Client-side fallback calculation using per-contour zone selections
function calculateClientSide(areas, spacing, mapScale, porosity, boi, bgi, gocLevel, hGOC, hBottom, oilSatOil, gasSatGas, oilSatGas) {
    // Ensure zoneSelections exist
    if (!zoneSelections || zoneSelections.length === 0) {
        // If no zone selections, treat all as oil
        zoneSelections = areas.map(() => 'oil');
    }
    
    // Calculate bulk volumes separately for oil and gas zones by interval
    let oilBV = calculateBulkVolumeByInterval(areas, contourLevels, zoneSelections, 'oil');
    let gasBV = calculateBulkVolumeByInterval(areas, contourLevels, zoneSelections, 'gas');
    
    const hasGOC = gocLevel !== null && !isNaN(gocLevel);

    // Count oil and gas zone contour levels
    let oilCount = 0;
    let gasCount = 0;
    for (let i = 0; i < areas.length; i++) {
        if (!zoneSelections || zoneSelections[i] === 'oil') {
            oilCount++;
        } else if (zoneSelections && zoneSelections[i] === 'gas') {
            gasCount++;
        }
    }

    // Convert BV (in²-ft) to acres using map scale
    // BV in acres = (BV in in²-ft) × (mapScale²) / 6,272,640
    let oilAcres = (oilBV * mapScale * mapScale) / 6272640;
    let gasAcres = (gasBV * mapScale * mapScale) / 6272640;
    
    // Calculate OOIP (Oil) using Oil Saturation in Oil Zone
    let ooip = 'N/A';
    if (boi && boi > 0 && oilAcres > 0) {
        // N = 7758 × BV_oil × φ × So_oil / Boi
        // Result in STB, then convert to MMSTB by dividing by 1,000,000
        const ooipSTB = 7758 * oilAcres * porosity * oilSatOil / boi;
        ooip = ooipSTB / 1000000; // Convert to MMSTB
    }
    
    // Calculate OGIP (Gas) using Gas Saturation in Gas Zone
    let ogip = 'N/A';
    if (bgi && bgi > 0 && gasAcres > 0) {
        // G = 43560 × BV_gas × φ × Sg_gas / Bgi
        // Result in SCF, then convert to MMSCF by dividing by 1,000,000
        const ogipSCF = 43560 * gasAcres * porosity * gasSatGas / bgi;
        ogip = ogipSCF / 1000000; // Convert to MMSCF
    }

    const result = {
        bulkVolume: oilAcres,
        bulkVolumeGas: gasAcres,
        bulkVolumeInches: oilBV,
        bulkVolumeGasInches: gasBV,
        ooip: ooip,
        ogip: ogip,
        hasGOC: hasGOC,
        gocLevel: gocLevel,
        numCLs: areas.length,
        oilCLCount: oilCount,
        gasCLCount: gasCount,
        calculations: {
            trapezoidal: {
                bulkVolume: oilAcres,
                bulkVolumeGas: gasAcres,
                unit: 'acre-ft',
                ooip: ooip,
                ogip: ogip,
                numberOfIntervals: areas.length - 1
            }
        }
    };
    
    return result;
}

// Compute volume
async function compute() {
    // Validate all required inputs
    const errors = [];
    
    // Check: ALL area data must be entered (all 5 rows must be complete)
    const tableInputs = document.querySelectorAll('.area-input');
    let allAreasComplete = true;
    
    if (tableInputs.length > 0) {
        for (let input of tableInputs) {
            // Check if input is empty or invalid
            if (!input.value || isNaN(parseFloat(input.value)) || parseFloat(input.value) < 0) {
                allAreasComplete = false;
                break;
            }
        }
    } else {
        allAreasComplete = false;
    }
    
    if (!allAreasComplete) {
        showSimpleError('Fill all the data');
        return;
    }
    
    // Validate cross sections from table - collect all sections
    if (tableInputs.length === 0) {
        errors.push('Please enter cross-sectional data');
    } else {
        crossSections = [];
        contourLevels = []; // Also read C.L values from input fields
        const clInputs = document.querySelectorAll('.cl-input');
        
        tableInputs.forEach((input, i) => {
            // Collect all validated inputs (already checked they're complete above)
            if (input.value && !isNaN(parseFloat(input.value)) && parseFloat(input.value) >= 0) {
                crossSections.push(parseFloat(input.value));
            }
            // Read C.L values from input fields
            if (clInputs[i]) {
                const clValue = parseFloat(clInputs[i].value);
                if (!isNaN(clValue)) {
                    contourLevels.push(clValue);
                } else {
                    contourLevels.push(i * 10); // Fallback to index * spacing
                }
            }
        });
        
        // If sections don't match expected count, that's an error
        if (crossSections.length !== tableInputs.length) {
            errors.push('All cross-sectional area values must be valid');
        }
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
    
    // Validate Boi factor (required for oil calculation)
    const boiInput = document.getElementById('boiFactor');
    if (!boiInput.value || parseFloat(boiInput.value) <= 0) {
        errors.push('Oil Formation Factor (Boi) must be greater than 0');
    }
    
    // Get partial thickness values - at least one must be specified
    const hGOCInput = document.getElementById('partialHeightGOC');
    const hBottomInput = document.getElementById('partialHeightBottom');
    const hGOC = hGOCInput.value ? parseFloat(hGOCInput.value) : null;
    const hBottom = hBottomInput.value ? parseFloat(hBottomInput.value) : null;
    
    if (!hBottom && !hGOC) {
        errors.push('Partial Thickness at Bottom (h\') must be specified');
    }
    
    // Get GOC level from input if specified
    const gocLevelInput = document.getElementById('gocLevel');
    let gocLevel = null;
    if (gocLevelInput && gocLevelInput.value) {
        const gocValue = parseFloat(gocLevelInput.value);
        if (!isNaN(gocValue)) {
            gocLevel = gocValue;
        }
    }
    
    // If there are errors, display them and return
    if (errors.length > 0) {
        displayValidationErrors(errors);
        return;
    }
    
    // Get reservoir properties
    const mapScale = parseFloat(mapScaleInput.value);
    const porosity = parseFloat(porosityInput.value) / 100;
    const boiFactor = parseFloat(boiInput.value);
    const spacing = parseFloat(spacingInput.value);
    
    // Get Bgi if specified
    const bgiInput = document.getElementById('bgiFactor');
    const bgiFactor = bgiInput.value ? parseFloat(bgiInput.value) : null;
    
    // Get saturation values
    const oilSatOilInput = document.getElementById('oilSatOil');
    const gasSatGasInput = document.getElementById('gasSatGas');
    const oilSatGasInput = document.getElementById('oilSatGas');
    
    const oilSatOil = oilSatOilInput.value ? parseFloat(oilSatOilInput.value) / 100 : 0.80;
    const gasSatGas = gasSatGasInput.value ? parseFloat(gasSatGasInput.value) / 100 : 0.75;
    const oilSatGas = oilSatGasInput.value ? parseFloat(oilSatGasInput.value) / 100 : 0.25;
    
    try {
        computeBtn.disabled = true;
        computeBtn.innerHTML = '<span class="spinner">⏳</span> Computing...';
        
        // Use client-side calculation
        const clientResults = calculateClientSide(
            crossSections, 
            spacing, 
            mapScale, 
            porosity, 
            boiFactor,
            bgiFactor,
            gocLevel,
            hGOC,
            hBottom,
            oilSatOil,
            gasSatGas,
            oilSatGas
        );
        
        if (clientResults) {
            lastResults = clientResults;
            clearValidationErrors();
            hasResults = true;
            displayResults(clientResults);
            displayInputTable();
        } else {
            throw new Error('Calculation failed');
        }
    } catch (error) {
        console.error('Calculation error:', error);
        displayValidationErrors([error.message || 'An error occurred during calculation']);
        computeBtn.disabled = false;
        computeBtn.innerHTML = 'Calculate';
        return;
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
    
    // Reset modal header to normal (in case error was shown)
    const modalHeader = document.querySelector('.modal-header h2');
    if (modalHeader) {
        modalHeader.textContent = 'RESULTS';
    }
    
    // Build modal content
    let modalContent = '';
    
    // Show calculation results
    const calc = results.calculations.trapezoidal;
    if (calc) {
        let bvOilStr = typeof calc.bulkVolume === 'number' ? calc.bulkVolume.toFixed(5) + ' acre-ft' : 'N/A';
        let bvGasStr = typeof calc.bulkVolumeGas === 'number' && calc.bulkVolumeGas > 0 ? calc.bulkVolumeGas.toFixed(5) + ' acre-ft' : 'N/A';
        let ooipStr = typeof calc.ooip === 'number' ? calc.ooip.toFixed(5) + ' MMSTB' : (calc.ooip === 'N/A' ? 'N/A' : 'N/A');
        let ogipStr = typeof calc.ogip === 'number' ? calc.ogip.toFixed(5) + ' MMSCF' : (calc.ogip === 'N/A' ? 'N/A' : 'N/A');
        
        modalContent += `
            <div class="results-table-wrapper">
                <h3>Bulk Volume</h3>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Bulk Volume</th>
                            <th>OOIP</th>
                            <th>OGIP</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Oil</strong></td>
                            <td><strong>${bvOilStr}</strong></td>
                            <td><strong>${ooipStr}</strong></td>
                            <td>-</td>
                        </tr>
        `;
        
        if (results.hasGOC && calc.bulkVolumeGas > 0) {
            modalContent += `
                        <tr>
                            <td><strong>Gas</strong></td>
                            <td><strong>${bvGasStr}</strong></td>
                            <td>-</td>
                            <td><strong>${ogipStr}</strong></td>
                        </tr>
            `;
        }
        
        modalContent += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Add interval analysis table
    modalContent += generateUnifiedIntervalAnalysisTable();
    
    // Set results content in modal
    document.getElementById('modalResults').innerHTML = modalContent;
    bindMethodInfoButtons();
    
    // Change button to "Show Result"
    computeBtn.innerHTML = 'Show Result';
    
    // Show the results modal
    showResultsModal();
}

// Generate interval analysis table for method selection
function buildInterpretationBadge(label, color) {
    return `
        <span class="method-interpretation">
            <span class="method-label" style="color: ${color};">${label}</span>
        </span>
    `;
}

function buildMethodBadge(label, color, infoType, showInfo = true) {
    return `
        <span class="method-interpretation method-interpretation-inline">
            <span class="method-label" style="color: ${color};">${label}</span>
        </span>
    `;
}

function buildMethodReason(method, ratio, details) {
    if (details) {
        return details;
    }

    if (method === 'Pyramidal') {
        return `Used because A<sub>n</sub>/A<sub>n-1</sub> = ${ratio.toFixed(2)} ≤ 0.5, so the pyramidal rule gives a better fit.`;
    }

    return `Used because A<sub>n</sub>/A<sub>n-1</sub> = ${ratio.toFixed(2)} > 0.5, so the trapezoidal rule is applied.`;
}

function buildRatioCheck(ratio) {
    if (typeof ratio !== 'number' || Number.isNaN(ratio)) {
        return '-';
    }

    return ratio >= 0.5
        ? '<span style="color: #007bff; font-weight: 700;">Yes</span>'
        : '<span style="color: #28a745; font-weight: 700;">No</span>';
}

// Generate interval analysis table
function generateUnifiedIntervalAnalysisTable() {
    return generateMethodsOnlyTable();
}

// Show only trapezoidal/pyramidal methods
function generateMethodsOnlyTable() {
    if (crossSections.length < 2) return '';
    
    usedMethodsInCurrentTable.clear();
    
    let tableHTML = `
        <div class="analysis-table-wrapper" style="margin-top: 24px; overflow-x: auto;">
            <h3 class="analysis-table-title">Interval Analysis</h3>
            <table class="interval-analysis-table">
                <thead>
                    <tr>
                        <th>Contour Level Interval</th>
                        <th>Zone</th>
                        <th>A<sub>n</sub>/A<sub>n-1</sub></th>
                        <th>&ge; 0.5</th>
                        <th>Method Used <button type="button" class="method-info-btn" data-method-info="all-methods-interval" aria-label="View all methods explanation">i</button></th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    let previousMethodKey = null;

    for (let i = 0; i < crossSections.length - 1; i++) {
        const an = crossSections[i];
        const an1 = crossSections[i + 1];
        const ratio = an1 / an;
        const isValidRatio = ratio <= 0.5;
        const cl1 = contourLines[i] !== undefined ? Math.round(contourLines[i]) : i;
        const cl2 = contourLines[i + 1] !== undefined ? Math.round(contourLines[i + 1]) : (i + 1);
        const method = isValidRatio ? 'Pyramidal' : 'Trapezoidal';
        const methodColor = isValidRatio ? '#28a745' : '#007bff';
        
        // Track which method is used
        if (isValidRatio) {
            usedMethodsInCurrentTable.add('pyramidal');
        } else {
            usedMethodsInCurrentTable.add('trapezoidal');
        }
        
        const selectedZone = zoneSelections[i] || 'oil';
        const zone = selectedZone.charAt(0).toUpperCase() + selectedZone.slice(1);
        const zoneColor = selectedZone === 'oil' ? '#1a3a52' : '#dc3545';
        const methodKey = isValidRatio ? 'pyramidal' : 'trapezoidal';
        const showInfo = previousMethodKey !== methodKey;
        
        tableHTML += `
            <tr>
                <td>${cl1}-${cl2}</td>
                <td style="color: ${zoneColor}; font-weight: bold;">${zone}</td>
                <td>${ratio.toFixed(2)}</td>
                <td>${buildRatioCheck(ratio)}</td>
                <td>${buildMethodBadge(method, methodColor, methodKey, showInfo)}</td>
            </tr>
        `;

        previousMethodKey = methodKey;
    }
    
    tableHTML += '</tbody></table></div>';
    return tableHTML;
}

function buildMethodExplanationHtml(methodKey) {
    if (methodKey === 'all-methods-interval' || methodKey === 'all-methods-simpson' || methodKey === 'all-methods-mixed') {
        // Show only methods that are actually used in this table
        let explanations = [];

        if (usedMethodsInCurrentTable.has('pyramidal')) {
            explanations.push('<li><strong>Pyramidal Rule:</strong> Used when the ratio A<sub>n</sub>/A<sub>n-1</sub> ≤ 0.5, indicating the interval narrows enough for better fit.</li>');
        }

        if (usedMethodsInCurrentTable.has('trapezoidal')) {
            explanations.push('<li><strong>Trapezoidal Rule:</strong> Used when the ratio A<sub>n</sub>/A<sub>n-1</sub> > 0.5, meaning area change is not steep enough for pyramidal rule.</li>');
        }

        if (explanations.length === 0) {
            return `<div class="method-explanation-content"><p>No methods found in this table.</p></div>`;
        }

        return `
            <div class="method-explanation-content">
                <p><strong>Methods Used in This Table:</strong></p>
                <ul>${explanations.join('')}</ul>
            </div>
        `;
    }

    if (methodKey === 'pyramidal') {
        return `
            <div class="method-explanation-content">
                <p><strong>Pyramidal Rule</strong> is used because the ratio A<sub>n</sub>/A<sub>n-1</sub> is less than or equal to 0.5.</p>
                <p>That indicates the interval narrows enough that the pyramidal approximation is the better fit.</p>
            </div>
        `;
    }

    if (methodKey === 'trapezoidal') {
        return `
            <div class="method-explanation-content">
                <p><strong>Trapezoidal Rule</strong> is used because the ratio A<sub>n</sub>/A<sub>n-1</sub> is greater than 0.5.</p>
                <p>That means the area change is not steep enough for the pyramidal rule, so the trapezoidal approximation is used.</p>
            </div>
        `;
    }

    return `
        <div class="method-explanation-content">
            <p>No method explanation is available for this selection.</p>
        </div>
    `;
}

function ensureMethodInfoModal() {
    let modal = document.getElementById('methodInfoModal');
    if (modal) {
        return modal;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="methodInfoModal" class="modal method-info-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Method Explanation</h2>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body" id="methodInfoModalBody"></div>
            </div>
        </div>
    `);

    return document.getElementById('methodInfoModal');
}

function showMethodExplanationModal(methodKey) {
    const modal = ensureMethodInfoModal();
    const modalBody = document.getElementById('methodInfoModalBody');

    if (modalBody) {
        modalBody.innerHTML = buildMethodExplanationHtml(methodKey);
    }

    modal.classList.add('active');
}

function closeMethodExplanationModal() {
    const modal = document.getElementById('methodInfoModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function setupMethodInfoModalHandlers() {
    const modal = ensureMethodInfoModal();
    const closeBtn = modal.querySelector('.modal-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMethodExplanationModal);
    }

    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeMethodExplanationModal();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeMethodExplanationModal();
        }
    });
}

function bindMethodInfoButtons() {
    document.querySelectorAll('.method-info-btn').forEach(button => {
        button.addEventListener('click', function() {
            showMethodExplanationModal(this.dataset.methodInfo);
        });
    });
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
        const method = meetsCondition ? 'Pyramidal' : 'Trapezoidal';
        
        html += `
            <tr>
                <td>${cl1.toFixed(0)} - ${cl2.toFixed(0)}</td>
                <td>${ratio.toFixed(2)}</td>
                <td>${meetsCondition ? '<span style="color: #27ae60; font-weight: bold;">Yes</span>' : '<span style="color: #e74c3c; font-weight: bold;">No</span>'}</td>
                <td>${buildInterpretationBadge(method, meetsCondition ? '#27ae60' : '#007bff')}</td>
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
    const methodName = selectedFormula === 'trapezoidal' ? 'Trapezoidal' : 'Pyramid';
    
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


// Display simple error message
function showSimpleError(message) {
    const modal = document.getElementById('resultsModal');
    const modalHeader = document.querySelector('.modal-header h2');
    const modalBody = document.getElementById('modalResults');
    
    if (modalHeader) {
        modalHeader.textContent = '⚠ Error';
    }
    
    if (modalBody) {
        modalBody.innerHTML = `<div style="padding: 20px; text-align: center; font-size: 1.1em; color: #d32f2f;">
            <div style="margin-bottom: 10px; font-size: 2em;">⚠</div>
            <div style="font-weight: 600; margin-bottom: 10px;">${message}</div>
            <div style="font-size: 0.9em; color: #666; margin-top: 15px;">Please enter area values in the Input Summary table</div>
        </div>`;
    }
    
    if (modal) {
        modal.classList.add('active');
    }
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
    if (!inputTable) {
        console.error('Input table element not found');
        return;
    }
    
    // Ensure we have rows initialized (even if empty)
    if (crossSections.length === 0) {
        console.warn('No cross sections data. Initializing empty rows...');
        // Initialize with 5 empty rows
        for (let i = 0; i < 5; i++) {
            crossSections[i] = '';
            contourLines[i] = i * 10;
            zoneSelections[i] = 'oil'; // Default zone
        }
    }
    
    // Ensure zoneSelections array is same length as crossSections
    while (zoneSelections.length < crossSections.length) {
        zoneSelections.push('oil'); // Default new rows to oil
    }
    
    let html = `
        <thead>
            <tr>
                <th>C.L</th>
                <th>Zone</th>
                <th>Area (inch²)</th>
                <th style="text-align: center;">Action</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    // Loop through all cross sections
    for (let i = 0; i < crossSections.length; i++) {
        const cl = contourLines[i] !== undefined ? contourLines[i] : i;
        const areaValue = crossSections[i] !== '' && !isNaN(crossSections[i]) ? crossSections[i] : '';
        const areaValueAttr = areaValue !== '' ? `value="${areaValue}"` : '';
        const selectedZone = zoneSelections[i] || 'oil';
        
        html += `
            <tr>
                <td>
                    <input type="number" 
                           class="table-input cl-input" 
                           data-index="${i}" 
                           value="${cl.toFixed ? Math.round(cl) : cl}" 
                           step="1" 
                           min="0"
                           style="text-align: center;">
                </td>
                <td style="text-align: center;">
                    <select class="zone-select" data-index="${i}">
                        <option value="oil" ${selectedZone === 'oil' ? 'selected' : ''}>Oil</option>
                        <option value="gas" ${selectedZone === 'gas' ? 'selected' : ''}>Gas</option>
                    </select>
                </td>
                <td>
                    <input type="number" 
                           class="table-input area-input" 
                           data-index="${i}" 
                           placeholder="e.g., 10"
                           ${areaValueAttr}
                           step="any"
                           min="0"
                           style="text-align: center;">
                </td>
                <td style="text-align: center;">
                    <button class="delete-btn" data-index="${i}" title="Delete row">✕</button>
                </td>
            </tr>
        `;
    }
    
    html += `
        </tbody>
    `;
    
    inputTable.innerHTML = html;
    
    // Immediately apply center alignment to all input fields and their parent cells
    setTimeout(() => {
        document.querySelectorAll('.cl-input').forEach(input => {
            input.style.textAlign = 'center';
            input.style.paddingLeft = '0';
            input.style.paddingRight = '0';
            // Center the cell itself
            const td = input.parentElement;
            if (td) {
                td.style.textAlign = 'center';
            }
        });
        
        document.querySelectorAll('.area-input').forEach(input => {
            input.style.textAlign = 'center';
            input.style.paddingLeft = '0';
            input.style.paddingRight = '0';
            // Center the cell itself
            const td = input.parentElement;
            if (td) {
                td.style.textAlign = 'center';
            }
        });
    }, 0);
    
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
        
        // Add keyboard navigation - down arrow to next row
        input.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const index = parseInt(this.dataset.index);
                const nextInput = document.querySelector(`.cl-input[data-index="${index + 1}"]`);
                if (nextInput) {
                    nextInput.focus();
                }
            }
        });
    });
    
    // Add event listeners to Zone selectors
    document.querySelectorAll('.zone-select').forEach(select => {
        select.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            zoneSelections[index] = this.value;
            resetResults();
        });
    });
    
    // Add event listeners to Area inputs
    document.querySelectorAll('.area-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            const value = this.value.trim();
            if (value) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 0) {
                    crossSections[index] = numValue;
                }
            } else {
                crossSections[index] = '';
            }
            resetResults();
        });
        
        input.addEventListener('blur', function() {
            const index = parseInt(this.dataset.index);
            // Don't modify the value on blur - let user keep what they typed
            // Just ensure it's stored in crossSections
            const value = this.value.trim();
            if (value) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 0) {
                    crossSections[index] = numValue;
                }
            } else {
                crossSections[index] = '';
            }
        });
        
        // Add keyboard navigation - down arrow to next row
        input.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const index = parseInt(this.dataset.index);
                const nextInput = document.querySelector(`.area-input[data-index="${index + 1}"]`);
                if (nextInput) {
                    nextInput.focus();
                }
            }
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
    initializeDOMElements();
    
    // Add event listeners now that DOM elements are initialized
    calculatorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleComputeButtonClick();
    });

    addRowBtn.addEventListener('click', addTableRow);
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
    document.getElementById('boiFactor')?.addEventListener('change', () => {
        resetResults();
        updateComputeButtonState();
    });
    document.getElementById('mapScale')?.addEventListener('input', updateComputeButtonState);
    document.getElementById('porosity')?.addEventListener('input', updateComputeButtonState);
    document.getElementById('boiFactor')?.addEventListener('input', updateComputeButtonState);
    document.getElementById('boiFactor')?.addEventListener('change', resetResults);
    document.getElementById('partialHeight')?.addEventListener('change', resetResults);
    document.getElementById('partialArea')?.addEventListener('change', resetResults);
    document.getElementById('ooipValue')?.addEventListener('change', resetResults);
    csvFile.addEventListener('change', () => {
        handleCsvUpload();
    });
    
    createHiddenCheckboxes();
    initializeTable();
    setupFormulasModalHandlers();
    setupMethodInfoModalHandlers();
    setupBackButton();
    setupModalHandlers();
    updateComputeButtonState(); // Initialize button state
    enforceWholeNumberDisplay(); // Display whole numbers in UI

    // Ensure any change in any input/select inside the form resets results
    if (calculatorForm) {
        calculatorForm.addEventListener('input', (e) => {
            const tgt = e.target;
            if (!tgt) return;
            // Ignore non-form controls like buttons
            const tag = (tgt.tagName || '').toUpperCase();
            if (tag === 'BUTTON') return;
            resetResults();
            updateComputeButtonState();
        }, { passive: true });

        calculatorForm.addEventListener('change', (e) => {
            const tgt = e.target;
            if (!tgt) return;
            const tag = (tgt.tagName || '').toUpperCase();
            if (tag === 'BUTTON') return;
            resetResults();
            updateComputeButtonState();
        });
    }
});

// Function to enforce whole number display ONLY for specific fields
function enforceWholeNumberDisplay() {
    // Only round whole numbers for spacing/contour interval and map scale
    // DO NOT round saturation values, porosity, or formation factors
    const fieldsToRound = ['spacing', 'mapScale', 'partialHeightGOC', 'partialHeightBottom', 'gocLevel'];
    
    fieldsToRound.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.addEventListener('blur', function() {
                if (this.value && !isNaN(this.value)) {
                    this.value = Math.round(parseFloat(this.value));
                }
            });
            
            input.addEventListener('change', function() {
                if (this.value && !isNaN(this.value)) {
                    this.value = Math.round(parseFloat(this.value));
                }
            });
        }
    });
}