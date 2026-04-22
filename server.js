const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conversion Functions
function convertMapAreaToAcres(areaInch2, mapScale) {
  // 1 inch = mapScale inches (actual)
  // 1 in² = (mapScale)² in²
  // 1 ft² = 144 in²
  // 1 acre = 43560 ft²
  const areaIn2 = areaInch2 * (mapScale * mapScale);
  const areaFt2 = areaIn2 / 144;
  const areaAcres = areaFt2 / 43560;
  return areaAcres;
}

// Calculate bulk volume by interval with appropriate method selection
function calculateBulkVolumeByInterval(areas, spacing, zoneSelections, zoneName) {
  if (areas.length < 2) return 0;
  
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
    
    let intervalBV = 0;
    
    // Select method based on area ratio
    if (ratio <= 0.5) {
      // Use Pyramidal/Frustum method: BV = (h/3) × [A_i + A_{i+1} + √(A_i × A_{i+1})]
      const geometricMean = Math.sqrt(a_n * a_n1);
      intervalBV = (spacing / 3) * (a_n + a_n1 + geometricMean);
    } else {
      // Use Trapezoidal method: BV = (h/2) × [A_i + A_{i+1}]
      intervalBV = (spacing / 2) * (a_n + a_n1);
    }
    
    totalBV += intervalBV;
  }
  
  return totalBV;
}

// Calculation Functions
function trapezoidalRule(heights, crossSections, partialHeight = null, partialArea = null) {
  if (crossSections.length < 2) return null;
  
  let total = 0;
  for (let i = 0; i < crossSections.length - 1; i++) {
    total += ((crossSections[i] + crossSections[i + 1]) / 2) * heights[i];
  }
  
  // Add partial thickness if exists
  if (partialHeight !== null && partialArea !== null) {
    total += (partialHeight / 2) * crossSections[crossSections.length - 1] + partialArea;
  }
  
  return total;
}

function pyramidRule(heights, crossSections, partialHeight = null, partialArea = null) {
  if (crossSections.length < 2) return null;
  
  // Pyramidal (Frustum) Method: BV = (h/3) × [A_i + A_{i+1} + √(A_i × A_{i+1})]
  let result = 0;
  
  for (let i = 0; i < crossSections.length - 1; i++) {
    const h = heights[i] || heights[0];  // Use specific height or default
    const A_i = crossSections[i];
    const A_i1 = crossSections[i + 1];
    const geometricMean = Math.sqrt(A_i * A_i1);
    
    result += (h / 3) * (A_i + A_i1 + geometricMean);
  }
  
  // Add partial thickness if exists (triangular method)
  if (partialHeight !== null && partialArea !== null) {
    const A_n = crossSections[crossSections.length - 1];
    result += (partialHeight / 3) * (A_n + partialArea + Math.sqrt(A_n * partialArea));
  }
  
  return result;
}

function simpsons38Rule(heights, crossSections, partialHeight = null, partialArea = null) {
  if (crossSections.length < 4) return null;
  
  const h = heights[0];
  let total = crossSections[0] + crossSections[crossSections.length - 1];
  
  // Coefficients for Simpson's 3/8: [1, 3, 3, 2, 3, 3, 2, ..., 3, 3, 1]
  // Pattern: points at i%3==0 get coefficient 2, others get 3
  for (let i = 1; i < crossSections.length - 1; i++) {
    if ((i % 3) === 0) {
      total += 2 * crossSections[i];  // Points at intervals of 3
    } else {
      total += 3 * crossSections[i];  // Other points
    }
  }
  
  let result = (3 * h / 8) * total;
  
  // Add partial thickness if exists
  if (partialHeight !== null && partialArea !== null) {
    result += (partialHeight / 3) * (crossSections[crossSections.length - 1] + partialArea);
  }
  
  return result;
}

// Calculate Original Oil in Place
function calculateOOIP(bulkVolume, porosity, oilSaturation, boiFormationVolumeFactor) {
  // N = 7758 × BV × φ × So / Boi
  // Where So is the oil saturation in the oil zone
  if (!bulkVolume || porosity === null || oilSaturation === null || !boiFormationVolumeFactor) {
    return null;
  }
  
  const n = (7758 * bulkVolume * porosity * oilSaturation) / boiFormationVolumeFactor;
  return n;
}

// Calculate Original Gas in Place
function calculateOGIP(bulkVolume, porosity, gasSaturation, bgiFormationVolumeFactor) {
  // G = 43560 × BV × φ × Sg / Bgi
  // Where Sg is the gas saturation in the gas zone
  // Note: 43560 = ft³ per acre-ft (converts acre-ft to SCF)
  if (!bulkVolume || porosity === null || gasSaturation === null || !bgiFormationVolumeFactor) {
    return null;
  }
  
  const g = (43560 * bulkVolume * porosity * gasSaturation) / bgiFormationVolumeFactor;
  return g;
}

// Split cross-sections into oil and gas zones based on GOC
function splitByGOC(crossSections, contourLevels, heights, gocLevel) {
  // Find the GOC index
  let gocIndex = -1;
  for (let i = 0; i < contourLevels.length; i++) {
    if (Math.abs(contourLevels[i] - gocLevel) < 0.01) {
      gocIndex = i;
      break;
    }
  }
  
  if (gocIndex === -1) {
    // GOC not found at exact level, find closest
    let minDiff = Math.abs(contourLevels[0] - gocLevel);
    gocIndex = 0;
    for (let i = 1; i < contourLevels.length; i++) {
      const diff = Math.abs(contourLevels[i] - gocLevel);
      if (diff < minDiff) {
        minDiff = diff;
        gocIndex = i;
      }
    }
  }
  
  // Split the arrays
  const oilSections = crossSections.slice(0, gocIndex + 1);
  const gasSections = crossSections.slice(gocIndex);
  
  const oilHeights = heights.slice(0, gocIndex);
  const gasHeights = heights.slice(gocIndex);
  
  return {
    oilSections,
    gasSections,
    oilHeights,
    gasHeights,
    gocIndex,
    gocContourLevel: contourLevels[gocIndex]
  };
}

// Check Simpson conditions: requires odd number of sections and uniform thickness
function checkSimpsonConditions(heights, crossSections) {
  const conditions = {
    hasOddSections: crossSections.length % 2 === 1,
    hasUniformThickness: true,
    errors: []
  };
  
  // Check uniform thickness
  if (heights.length > 0) {
    const firstHeight = heights[0];
    for (let i = 1; i < heights.length; i++) {
      if (Math.abs(heights[i] - firstHeight) > 0.01) {  // Allow small tolerance
        conditions.hasUniformThickness = false;
        conditions.errors.push(`Thickness not uniform: h[${i}]=${heights[i]}, expected ${firstHeight}`);
      }
    }
  }
  
  if (!conditions.hasOddSections) {
    conditions.errors.push(`Requires odd number of sections, got ${crossSections.length}`);
  }
  
  return conditions;
}

// API Routes
app.post('/api/calculate', (req, res) => {
  try {
    const { 
      crossSections, 
      heights, 
      methods,
      contourLevels,
      zoneSelections,
      mapScale,
      porosity,
      waterSaturation,
      boiFormationVolumeFactor,
      bgiFormationVolumeFactor,
      oilSaturation,
      gasSaturation,
      oilSaturationGas,
      gocLevel,
      partialHeight,
      partialArea,
      partialHeightGOC,
      partialHeightBottom,
      missingField
    } = req.body;
    
    if (!crossSections || !heights || !Array.isArray(methods)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const results = {
      calculations: {},
      zoneInfo: {}
    };

    // Convert areas from in² to acres if mapScale is provided
    let areasInAcres = crossSections;
    if (mapScale && mapScale > 0) {
      areasInAcres = crossSections.map(area => convertMapAreaToAcres(area, mapScale));
      results.unitConversions = {
        mapScale: mapScale,
        areasIn2: crossSections,
        areasInAcres: areasInAcres.map(a => a.toFixed(4))
      };
    }

    // Split data by zone selections if provided
    let oilAreas = areasInAcres;
    let gasAreas = [];
    let oilHeights = heights;
    let gasHeights = [];
    let zoneInfo = null;

    if (zoneSelections && Array.isArray(zoneSelections)) {
      // Use zone selections to split data
      let oilSum = 0;
      let gasSum = 0;
      let oilHeightCount = 0;
      let gasHeightCount = 0;
      let oilAreaList = [];
      let gasAreaList = [];
      
      for (let i = 0; i < crossSections.length; i++) {
        const zone = zoneSelections[i] || 'oil';
        if (zone === 'oil') {
          oilAreaList.push(areasInAcres[i]);
          if (i < heights.length) {
            oilHeights[oilHeightCount] = heights[i];
            oilHeightCount++;
          }
        } else if (zone === 'gas') {
          gasAreaList.push(areasInAcres[i]);
          if (i < heights.length) {
            gasHeights[gasHeightCount] = heights[i];
            gasHeightCount++;
          }
        }
      }
      
      oilAreas = oilAreaList;
      gasAreas = gasAreaList;
      oilHeights = oilHeights.slice(0, oilHeightCount);
      gasHeights = gasHeights.slice(0, gasHeightCount);
      
      zoneInfo = {
        oilZoneCount: oilAreaList.length,
        gasZoneCount: gasAreaList.length
      };
      
      results.zoneInfo = zoneInfo;
    } else if (gocLevel !== null && gocLevel !== undefined) {
      // Fallback to GOC-based splitting if zoneSelections not provided
      const split = splitByGOC(areasInAcres, contourLevels || [], heights, gocLevel);
      oilAreas = split.oilSections;
      gasAreas = split.gasSections;
      oilHeights = split.oilHeights;
      gasHeights = split.gasHeights;
      
      zoneInfo = {
        gocDepth: gocLevel,
        gocIndex: split.gocIndex,
        oilZoneCount: split.oilSections.length,
        gasZoneCount: split.gasSections.length
      };
      
      results.zoneInfo = zoneInfo;
    }

    // If a missing field is specified, calculate it from OOIP
    let calculatedMissing = null;
    if (missingField) {
      // For this calculation, we need OOIP to solve for the missing field
      // We'll calculate OOIP from the non-missing fields first
      const bv = trapezoidalRule(heights, areasInAcres, partialHeight, partialArea);
      let usedPorosity = porosity ? porosity / 100 : 0.25;
      let usedWaterSat = waterSaturation ? waterSaturation / 100 : 0.30;
      let usedBoi = boiFormationVolumeFactor || 1.4;
      
      if (missingField === 'porosity') {
        // Prompt user for OOIP or use calculated OOIP as reference
        // For now, we'll allow the frontend to handle this
        calculatedMissing = { porosity: null }; // Placeholder
      } else if (missingField === 'waterSat') {
        calculatedMissing = { waterSat: null };
      } else if (missingField === 'boiFactor') {
        calculatedMissing = { boiFactor: null };
      }
    }

    if (methods.includes('trapezoidal')) {
      // Calculate oil zone using interval-based method if zone selections provided
      let oilBV;
      if (zoneSelections && Array.isArray(zoneSelections)) {
        oilBV = calculateBulkVolumeByInterval(areasInAcres, spacing || heights[0], zoneSelections, 'oil');
      } else {
        oilBV = trapezoidalRule(oilHeights, oilAreas, partialHeightGOC, null);
      }
      
      const oilOOIP = calculateOOIP(oilBV, porosity, oilSaturation || 0.80, boiFormationVolumeFactor);
      
      results.calculations.trapezoidal = {
        bulkVolumeOil: oilBV,
        oilOOIP: oilOOIP,
        unit: 'acre-ft',
        ooipUnit: 'STB'
      };
      
      // Calculate gas zone if gas areas exist and Bgi is provided
      if ((zoneSelections && zoneSelections.some(z => z === 'gas')) || (gasAreas.length > 0)) {
        let gasBV;
        if (zoneSelections && Array.isArray(zoneSelections)) {
          gasBV = calculateBulkVolumeByInterval(areasInAcres, spacing || heights[0], zoneSelections, 'gas');
        } else {
          gasBV = trapezoidalRule(gasHeights, gasAreas, partialHeightBottom, null);
        }
        
        if (gasBV > 0 && bgiFormationVolumeFactor) {
          const gasOGIP = calculateOGIP(gasBV, porosity, gasSaturation || 0.75, bgiFormationVolumeFactor);
          results.calculations.trapezoidal.bulkVolumeGas = gasBV;
          results.calculations.trapezoidal.gasOGIP = gasOGIP;
          results.calculations.trapezoidal.ogipUnit = 'SCF';
        }
      }
    }

    if (methods.includes('pyramid')) {
      // Pyramid method has NO specific conditions - works for any number of sections
      const oilBV = pyramidRule(oilHeights, oilAreas, partialHeightGOC, null);
      const oilOOIP = calculateOOIP(oilBV, porosity, oilSaturation || 0.80, boiFormationVolumeFactor);
      
      results.calculations.pyramid = {
        bulkVolumeOil: oilBV,
        oilOOIP: oilOOIP,
        unit: 'acre-ft',
        ooipUnit: 'STB'
      };
      
      // Calculate gas zone if gas areas exist and Bgi is provided
      if (gasAreas.length > 0 && bgiFormationVolumeFactor) {
        const gasBV = pyramidRule(gasHeights, gasAreas, partialHeightBottom, null);
        const gasOGIP = calculateOGIP(gasBV, porosity, gasSaturation || 0.75, bgiFormationVolumeFactor);
        results.calculations.pyramid.bulkVolumeGas = gasBV;
        results.calculations.pyramid.gasOGIP = gasOGIP;
        results.calculations.pyramid.ogipUnit = 'SCF';
      }
    }

    if (methods.includes('simpson38')) {
      const simpsonConditions = checkSimpsonConditions(oilHeights, oilAreas);
      
      if (simpsonConditions.hasOddSections && simpsonConditions.hasUniformThickness) {
        const oilBV = simpsons38Rule(oilHeights, oilAreas, partialHeightGOC, null);
        const oilOOIP = calculateOOIP(oilBV, porosity, oilSaturation || 0.80, boiFormationVolumeFactor);
        
        results.calculations.simpson38 = {
          bulkVolumeOil: oilBV,
          oilOOIP: oilOOIP,
          unit: 'acre-ft',
          ooipUnit: 'STB',
          conditions: simpsonConditions
        };
        
        // Calculate gas zone if gas areas exist and Bgi is provided
        if (gasAreas.length > 0 && bgiFormationVolumeFactor) {
          const gasConditions = checkSimpsonConditions(gasHeights, gasAreas);
          if (gasConditions.hasOddSections && gasConditions.hasUniformThickness) {
            const gasBV = simpsons38Rule(gasHeights, gasAreas, partialHeightBottom, null);
            const gasOGIP = calculateOGIP(gasBV, porosity, gasSaturation || 0.75, bgiFormationVolumeFactor);
            results.calculations.simpson38.bulkVolumeGas = gasBV;
            results.calculations.simpson38.gasOGIP = gasOGIP;
            results.calculations.simpson38.ogipUnit = 'SCF';
            results.calculations.simpson38.gasConditions = gasConditions;
          }
        }
      } else {
        results.calculations.simpson38 = {
          error: 'Simpson 3/8 Method requires: ' + simpsonConditions.errors.join(', '),
          bulkVolume: null,
          ooip: null,
          conditions: simpsonConditions
        };
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Bulk Volume Calculator running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop the server`);
});
