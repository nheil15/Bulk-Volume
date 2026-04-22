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

## 📱 Mobile-Responsive Design

The application is fully responsive and works great on:
- **Desktop** (1920px and above)
- **Tablets** (768px - 1024px)
- **Mobile Phones** (< 768px)
- **Small Phones** (< 600px)

Features optimized for mobile:
- Touch-friendly buttons (minimum 44px height)
- Responsive form fields with proper sizing
- Collapsible sections for better space usage
- Scrollable tables for data viewing
- Modal dialogs that adapt to screen size

### Testing on Mobile:
1. Use Chrome/Firefox DevTools (F12 → Toggle Device Toolbar)
2. Or access from your phone using your computer's IP address

## 🚀 Deploy to Vercel

### Prerequisites:
- GitHub account
- Vercel account (free at https://vercel.com)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Bulk Volume Calculator - Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/bulk-volume-calculator.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [https://vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Select your GitHub repository
4. Click **"Import"**
5. Vercel will auto-detect settings - click **"Deploy"**

**That's it!** Your app is now live on a Vercel URL like:
```
https://bulk-volume-calculator.vercel.app
```

### Step 3: Use Your Custom Domain (Optional)
1. In Vercel Dashboard, go to **Settings → Domains**
2. Add your custom domain
3. Update DNS settings at your domain provider

### How to Access on Mobile:
- From your phone, visit your Vercel URL
- App works perfectly with calculations on mobile
- No installation needed - just open in browser

### Environment Variables on Vercel:
The app uses `process.env.PORT` for serverless compatibility. No additional env variables needed for this app.

### Redeploy After Changes:
```bash
git add .
git commit -m "Update description"
git push origin main
```
Vercel automatically redeploys on every push!

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
