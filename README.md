# Bulk Volume Calculator

A web-based application for computing bulk volume using three different numerical methods: Trapezoidal Rule, Pyramid Rule (Simpson's 1/3), and Simpson's 3/8 Rule. The application includes interactive visualizations with tables and graphs.

## Features

✨ **Three Calculation Methods:**
- **Trapezoidal Rule**: Simple trapezoid-based approximation
- **Pyramid Rule (Simpson's 1/3)**: Parabolic approximation
- **Simpson's 3/8 Rule**: Cubic polynomial approximation (most accurate)

📊 **Visualization Options:**
- Cross-sectional area bar chart
- Method comparison bar chart
- Volume distribution profile with area fill

📋 **Multiple Input Methods:**
- Manual input: Enter values directly
- CSV upload: Import data from file
- Sample data: Try with built-in examples

## Installation

1. **Clone or download this project**

2. **Install Python** (3.8+ required)

3. **Install required packages:**
```bash
pip install -r requirements.txt
```

## Running the Application

```bash
streamlit run bulk_volume_calculator.py
```

The application will open in your default browser at `http://localhost:8501`

## How to Use

### Manual Input Method:
1. Select "Manual Input" from the sidebar
2. Specify the number of cross-sections (2-50)
3. Set the distance between sections
4. Enter cross-sectional area for each section
5. View results in metrics, table, and visualization

### CSV Upload Method:
1. Prepare a CSV file with columns: Section, Area
2. Select "Upload CSV" and choose your file
3. Results will display automatically

### Sample Data:
Select "Sample Data" to try the calculator with pre-loaded example data

## Results

The calculator displays:
- **Metrics**: Quick view of each method's result
- **Results Table**: Summary of all three methods
- **Visualizations**: Three tabs showing different views
- **Input Data Table**: Detailed breakdown of your input data
- **Method Explanations**: Learn about each numerical method

## Understanding the Methods

### Trapezoidal Rule
Uses trapezoids to approximate volume:
```
V = (h/2) × [A₀ + 2A₁ + 2A₂ + ... + Aₙ]
```
- **Fast and simple**
- **Less accurate for curves**

### Simpson's 1/3 Rule (Pyramid)
Uses parabolic sections:
```
V = (h/3) × [A₀ + 4A₁ + 2A₂ + 4A₃ + ... + Aₙ]
```
- **Better accuracy**
- **Requires odd number of sections**

### Simpson's 3/8 Rule
Uses cubic polynomials:
```
V = (3h/8) × [A₀ + 3A₁ + 3A₂ + 2A₃ + ...]
```
- **Most accurate**
- **Best for smooth curves**

## Requirements

- Python 3.8+
- streamlit
- numpy
- pandas
- matplotlib
- scipy

## Tips for Best Results

1. **Use more sections** for better accuracy (5-20 recommended)
2. **Ensure consistent spacing** between sections for accurate calculations
3. **Compare methods** to understand accuracy differences
4. **Use Simpson's 3/8** for most accurate results with smooth data

## Example: Bulk Storage Modeling

This calculator is ideal for:
- 📦 Bulk storage volume estimation
- 🏗️ Earthwork calculations
- 🌊 Reservoir volume computation
- 💾 Silo capacity determination
- 🌍 Geological survey analysis

## License

This project is open source and available for educational and commercial use.

## Support

For issues or questions, please refer to the method explanations in the app.
