const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

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
function calculateOOIP(bulkVolume, porosity, waterSaturation, boiFormationVolumeFactor) {
  // N = 7758 × BV × φ × (1 - Swi) / Boi
  if (!bulkVolume || porosity === null || waterSaturation === null || !boiFormationVolumeFactor) {
    return null;
  }
  
  const n = (7758 * bulkVolume * porosity * (1 - waterSaturation)) / boiFormationVolumeFactor;
  return n;
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
      mapScale,
      porosity,
      waterSaturation,
      boiFormationVolumeFactor,
      partialHeight,
      partialArea,
      missingField
    } = req.body;
    
    if (!crossSections || !heights || !Array.isArray(methods)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const results = {
      calculations: {}
    };

    // Convert areas from in² to acres if mapScale is provided
    let areasInAcres = crossSections;
    if (mapScale && mapScale > 0) {
      areasInAcres = crossSections.map(area => convertMapAreaToAcres(area, mapScale));
      results.unitConversions = {
        mapScale: mapScale,
        areasIn2: crossSections,
        areasInAcres: areasInAcres.map(a => a.toFixed(2))
      };
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
      const bv = trapezoidalRule(heights, areasInAcres, partialHeight, partialArea);
      results.calculations.trapezoidal = {
        bulkVolume: bv,
        unit: 'acre-ft',
        ooip: calculateOOIP(bv, porosity, waterSaturation, boiFormationVolumeFactor),
        ooipUnit: 'STB'
      };
    }

    if (methods.includes('pyramid')) {
      // Pyramid method has NO specific conditions - works for any number of sections
      const bv = pyramidRule(heights, areasInAcres, partialHeight, partialArea);
      results.calculations.pyramid = {
        bulkVolume: bv,
        unit: 'acre-ft',
        ooip: calculateOOIP(bv, porosity, waterSaturation, boiFormationVolumeFactor),
        ooipUnit: 'STB'
      };
    }

    if (methods.includes('simpson38')) {
      const simpsonConditions = checkSimpsonConditions(heights, areasInAcres);
      
      if (simpsonConditions.hasOddSections && simpsonConditions.hasUniformThickness) {
        const bv = simpsons38Rule(heights, areasInAcres, partialHeight, partialArea);
        results.calculations.simpson38 = {
          bulkVolume: bv,
          unit: 'acre-ft',
          ooip: calculateOOIP(bv, porosity, waterSaturation, boiFormationVolumeFactor),
          ooipUnit: 'STB',
          conditions: simpsonConditions
        };
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
