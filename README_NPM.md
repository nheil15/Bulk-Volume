# Bulk Volume Calculator - NPM Web App

A modern web-based application for computing bulk volume using three different numerical methods with formula selection functionality.

## Features

✨ **Three Calculation Methods:**
- **Trapezoidal Rule**: Simple trapezoid-based approximation
- **Pyramid Rule (Simpson's 1/3)**: Parabolic approximation (requires odd sections)
- **Simpson's 3/8 Rule**: Cubic polynomial approximation (most accurate)

🧮 **Formula Selection:**
- Choose which formulas to use BEFORE computing
- Each method can be toggled independently
- Real-time formula information displayed

📊 **Visualizations:**
- Cross-sectional area bar chart
- Method comparison bar chart
- Interactive charts with Chart.js

📋 **Multiple Input Methods:**
- Manual input: Enter values directly in the interface
- CSV upload: Import data from spreadsheets
- Sample data: Pre-loaded examples for testing

## Installation & Running with NPM

### 1. Install Node.js
If you don't have Node.js installed, download it from [nodejs.org](https://nodejs.org/)

### 2. Install Dependencies
```bash
cd "c:\Users\nheileduria\OneDrive\Documents\Bulk_Volume"
npm install
```

### 3. Start the Server
```bash
npm start
```

The application will run at: **http://localhost:3000**

### Development Mode (with auto-reload)
```bash
npm run dev
```

## How to Use

### Step 1: Enter Data
- **Option A**: Set number of sections and spacing, then enter areas manually
- **Option B**: Click "Load Sample Data" to use example values
- **Option C**: Upload a CSV file with cross-sectional areas

### Step 2: Select Formulas
- Check/uncheck the formulas you want to use:
  - ✓ Trapezoidal Rule (fast, less accurate)
  - ✓ Pyramid Rule (good accuracy, needs odd sections)
  - ✓ Simpson's 3/8 Rule (most accurate)

### Step 3: Compute
- Click the **"🔢 COMPUTE VOLUME"** button
- See results instantly with comparisons and charts

## Project Structure

```
Bulk_Volume/
├── server.js                 # Express.js server
├── package.json              # NPM dependencies
├── public/
│   ├── index.html            # Main HTML page
│   ├── styles.css            # Styling
│   └── script.js             # Frontend JavaScript
├── sample_data.csv           # Example CSV file
└── README_NPM.md             # This file
```

## API Endpoints

### POST /api/calculate
Calculates volume using selected methods.

**Request:**
```json
{
  "crossSections": [10.5, 15.2, 20.8, 18.5, 12.3],
  "heights": [1.0, 1.0, 1.0, 1.0],
  "methods": ["trapezoidal", "pyramid", "simpson38"]
}
```

**Response:**
```json
{
  "trapezoidal": 67.80,
  "pyramid": 68.43,
  "simpson38": 68.20
}
```

## Requirements

- Node.js 14+ 
- npm (comes with Node.js)
- Modern web browser (Chrome, Firefox, Edge, Safari)

## Technologies Used

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Charts**: Chart.js
- **Port**: 3000

## Formulas Reference

### Trapezoidal Rule
```
V = (h/2) × [A₀ + 2A₁ + 2A₂ + ... + Aₙ]
```
- Simple computation
- Good for linear changes

### Simpson's 1/3 Rule (Pyramid)
```
V = (h/3) × [A₀ + 4A₁ + 2A₂ + 4A₃ + ... + Aₙ]
```
- Better for parabolic shapes
- Requires odd number of sections

### Simpson's 3/8 Rule
```
V = (3h/8) × [A₀ + 3A₁ + 3A₂ + 2A₃ + ...]
```
- Most accurate for smooth curves
- Uses cubic polynomials

## Tips

1. **Best Accuracy**: Use Simpson's 3/8 Rule for smooth data
2. **More Sections**: 5-20 sections usually gives good results
3. **Even Spacing**: Consistent distances between sections improves accuracy
4. **Compare Methods**: Toggle different methods to see the variations

## CSV Format

Your CSV file should have this format:
```
Section,Area
1,10.5
2,15.2
3,20.8
4,18.5
5,12.3
```

## Troubleshooting

**Port 3000 already in use?**
```bash
# Change port in server.js if needed
# Change line: const PORT = 3000;
```

**Module not found error?**
```bash
npm install
```

**Browser can't connect?**
- Ensure server is running with `npm start`
- Check http://localhost:3000 in your browser

## License

MIT - Open source and free to use

## Support

For formula questions or calculations, refer to the formula info in the app interface.
