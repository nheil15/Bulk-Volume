import streamlit as st
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import integrate

st.set_page_config(page_title="Bulk Volume Calculator", layout="wide")

st.title("📦 Bulk Volume Calculator")
st.write("Calculate volume using Simpson's, Trapezoidal, Pyramidal, and Simpson's 3/8 methods")

# Sidebar for input method selection
st.sidebar.header("Input Method")
input_method = st.sidebar.radio(
    "Choose how to input data:",
    ["Manual Input", "Upload CSV", "Sample Data"]
)

# Initialize session state for data
if "cross_sections" not in st.session_state:
    st.session_state.cross_sections = []
if "heights" not in st.session_state:
    st.session_state.heights = []

def trapezoidal_rule(heights, cross_sections):
    """
    Calculate volume using Trapezoidal Rule
    Formula: V = (h/2) × [A₀ + 2A₁ + 2A₂ + ... + 2Aₙ₋₁ + Aₙ]
    """
    if len(cross_sections) < 2:
        return None
    
    h = heights[0] if len(set(heights)) == 1 else np.mean(heights)
    total = cross_sections[0] + cross_sections[-1]
    
    # Add 2 times the intermediate sections
    for i in range(1, len(cross_sections) - 1):
        total += 2 * cross_sections[i]
    
    return (h / 2) * total


def pyramid_rule(heights, cross_sections):
    """
    Calculate volume using Pyramid Rule (Simpson's 1/3)
    Formula: V = (h/3) × [A₀ + 4A₁ + 2A₂ + 4A₃ + ... + 2Aₙ₋₂ + 4Aₙ₋₁ + Aₙ]
    Requires: Odd number of cross-sections
    """
    if len(cross_sections) < 3:
        return None
    if len(cross_sections) % 2 == 0:
        return None  # Need odd number of sections
    
    h = heights[0] if len(set(heights)) == 1 else np.mean(heights)
    total = cross_sections[0] + cross_sections[-1]
    
    # Odd-indexed sections multiply by 4
    for i in range(1, len(cross_sections) - 1, 2):
        total += 4 * cross_sections[i]
    
    # Even-indexed sections (excluding first and last) multiply by 2
    for i in range(2, len(cross_sections) - 1, 2):
        total += 2 * cross_sections[i]
    
    return (h / 3) * total


def simpsons_13_rule(heights, cross_sections):
    """
    Calculate volume using Simpson's 1/3 Rule (also known as Simpson's Rule)
    Same as Pyramid Rule - requires odd number of sections
    Formula: V = (h/3) × [A₀ + 4A₁ + 2A₂ + 4A₃ + ... + 2Aₙ₋₂ + 4Aₙ₋₁ + Aₙ]
    """
    return pyramid_rule(heights, cross_sections)


def simpsons_38_rule(heights, cross_sections):
    """
    Calculate volume using Simpson's 3/8 Rule
    Formula: V = (3h/8) × [A₀ + 3A₁ + 3A₂ + 2A₃ + 3A₄ + 3A₅ + 2A₆ + ...]
    Requires: Number of intervals divisible by 3
    """
    if len(cross_sections) < 4:
        return None
    
    h = heights[0] if len(set(heights)) == 1 else np.mean(heights)
    n = len(cross_sections) - 1
    
    # Check if number of intervals is divisible by 3
    if n % 3 != 0:
        # Fall back to combining Simpson's 3/8 and Simpson's 1/3
        # Use Simpson's 3/8 for complete groups of 3, then handle remainder
        pass
    
    total = 0
    # Process in groups of 3 intervals
    for i in range(0, len(cross_sections) - 3, 3):
        total += (3 * h / 8) * (cross_sections[i] + 3 * cross_sections[i + 1] + 
                                3 * cross_sections[i + 2] + cross_sections[i + 3])
    
    # Handle remaining sections
    remainder = (len(cross_sections) - 1) % 3
    if remainder == 1:
        # One section left, use trapezoidal
        total += (h / 2) * (cross_sections[-2] + cross_sections[-1])
    elif remainder == 2:
        # Two sections left, use Simpson's 1/3
        total += (h / 3) * (cross_sections[-3] + 4 * cross_sections[-2] + cross_sections[-1])
    
    return total


def pyramidal_rule(heights, cross_sections):
    """
    Calculate volume using Pyramidal Method
    Uses pyramid/cone approximation for each section
    Formula: V = (h/3) × (A₀ + √(A₀×A₁) + A₁) + (h/3) × (A₁ + √(A₁×A₂) + A₂) + ...
    """
    if len(cross_sections) < 2:
        return None
    
    h = heights[0] if len(set(heights)) == 1 else np.mean(heights)
    total = 0
    
    for i in range(len(cross_sections) - 1):
        # Pyramidal approximation between consecutive sections
        A_i = cross_sections[i]
        A_i1 = cross_sections[i + 1]
        total += (h / 3) * (A_i + np.sqrt(A_i * A_i1) + A_i1)
    
    return total

# Data Input Section
st.header("📋 Data Input")

col1, col2 = st.columns(2)

if input_method == "Manual Input":
    with col1:
        num_sections = st.number_input("Number of cross-sections:", min_value=2, max_value=50, value=5)
    
    with col2:
        section_spacing = st.number_input("Distance between sections (m):", min_value=0.1, max_value=100.0, value=1.0)
    
    st.write("**Enter cross-sectional areas (m²):**")
    cross_sections = []
    heights = []
    
    cols = st.columns(5)
    for i in range(num_sections):
        with cols[i % 5]:
            area = st.number_input(f"Section {i+1} (m²):", min_value=0.0, value=10.0 * (i+1), key=f"section_{i}")
            cross_sections.append(area)
            heights.append(section_spacing)
    
    st.session_state.cross_sections = cross_sections
    st.session_state.heights = heights

elif input_method == "Upload CSV":
    uploaded_file = st.file_uploader("Upload CSV file (columns: Section, Area)", type="csv")
    if uploaded_file is not None:
        df = pd.read_csv(uploaded_file)
        st.dataframe(df)
        st.session_state.cross_sections = df.iloc[:, 1].tolist()
        st.session_state.heights = [1.0] * (len(df) - 1)

else:  # Sample Data
    sample_data = {
        'Section': list(range(1, 6)),
        'Cross-sectional Area (m²)': [10, 15, 20, 18, 12]
    }
    df_sample = pd.DataFrame(sample_data)
    st.dataframe(df_sample, use_container_width=True)
    st.session_state.cross_sections = sample_data['Cross-sectional Area (m²)']
    st.session_state.heights = [1.0] * 4

# Calculations
st.header("📊 Volume Calculations")

if len(st.session_state.cross_sections) > 0:
    cross_sections = st.session_state.cross_sections
    heights = st.session_state.heights
    
    # Calculate volumes
    vol_trap = trapezoidal_rule(heights, cross_sections)
    vol_simpson = simpsons_13_rule(heights, cross_sections)
    vol_simpson_38 = simpsons_38_rule(heights, cross_sections)
    vol_pyramidal = pyramidal_rule(heights, cross_sections)
    
    # Results Table
    col1, col2, col3, col4 = st.columns(4)
    
    results = []
    if vol_trap is not None:
        results.append({"Method": "Trapezoidal Rule", "Volume (m³)": f"{vol_trap:.2f}"})
        col1.metric("Trapezoidal", f"{vol_trap:.2f} m³", delta=None)
    
    if vol_simpson is not None:
        results.append({"Method": "Simpson's 1/3 Rule", "Volume (m³)": f"{vol_simpson:.2f}"})
        col2.metric("Simpson's 1/3", f"{vol_simpson:.2f} m³", delta=None)
    
    if vol_simpson_38 is not None:
        results.append({"Method": "Simpson's 3/8 Rule", "Volume (m³)": f"{vol_simpson_38:.2f}"})
        col3.metric("Simpson's 3/8", f"{vol_simpson_38:.2f} m³", delta=None)
    
    if vol_pyramidal is not None:
        results.append({"Method": "Pyramidal Rule", "Volume (m³)": f"{vol_pyramidal:.2f}"})
        col4.metric("Pyramidal", f"{vol_pyramidal:.2f} m³", delta=None)
    
    # Detailed Results Table
    st.subheader("📈 Results Summary")
    st.dataframe(pd.DataFrame(results), use_container_width=True)
    
    # Visualizations
    st.subheader("📉 Visualizations")
    
    tab1, tab2, tab3 = st.tabs(["Cross-sectional Areas", "Method Comparison", "Volume Distribution"])
    
    with tab1:
        fig, ax = plt.subplots(figsize=(10, 5))
        sections = list(range(1, len(cross_sections) + 1))
        ax.bar(sections, cross_sections, color='steelblue', edgecolor='black', alpha=0.7)
        ax.set_xlabel('Section Number', fontsize=12)
        ax.set_ylabel('Cross-sectional Area (m²)', fontsize=12)
        ax.set_title('Cross-sectional Areas by Section', fontsize=14, fontweight='bold')
        ax.grid(axis='y', alpha=0.3)
        st.pyplot(fig)
    
    with tab2:
        methods = []
        volumes = []
        colors_list = []
        
        if vol_trap is not None:
            methods.append("Trapezoidal")
            volumes.append(vol_trap)
            colors_list.append('#1f77b4')
        if vol_simpson is not None:
            methods.append("Simpson's 1/3")
            volumes.append(vol_simpson)
            colors_list.append('#ff7f0e')
        if vol_simpson_38 is not None:
            methods.append("Simpson's 3/8")
            volumes.append(vol_simpson_38)
            colors_list.append('#2ca02c')
        if vol_pyramidal is not None:
            methods.append("Pyramidal")
            volumes.append(vol_pyramidal)
            colors_list.append('#d62728')
        
        if methods:
            fig, ax = plt.subplots(figsize=(12, 5))
            bars = ax.bar(methods, volumes, color=colors_list, edgecolor='black', alpha=0.8)
            ax.set_ylabel('Volume (m³)', fontsize=12)
            ax.set_title('Volume Comparison - Different Methods', fontsize=14, fontweight='bold')
            ax.grid(axis='y', alpha=0.3)
            
            # Add value labels on bars
            for bar in bars:
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{height:.2f}',
                       ha='center', va='bottom', fontsize=11, fontweight='bold')
            
            st.pyplot(fig)
    
    with tab3:
        fig, ax = plt.subplots(figsize=(10, 5))
        ax.plot(sections, cross_sections, marker='o', linestyle='-', linewidth=2, 
                markersize=8, color='darkblue', label='Cross-sectional Area')
        ax.fill_between(sections, cross_sections, alpha=0.3, color='steelblue')
        ax.set_xlabel('Section Number', fontsize=12)
        ax.set_ylabel('Cross-sectional Area (m²)', fontsize=12)
        ax.set_title('Volume Distribution Profile', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.legend()
        st.pyplot(fig)
    
    # Input Data Table
    st.subheader("📝 Input Data Details")
    
    input_data = pd.DataFrame({
        'Section': [i+1 for i in range(len(cross_sections))],
        'Cross-sectional Area (m²)': cross_sections,
        'Height/Spacing (m)': heights if len(heights) == len(cross_sections) else [heights[0]] * len(cross_sections)
    })
    st.dataframe(input_data, use_container_width=True)
    
    # Method Explanations
    with st.expander("📚 Learn About the Methods"):
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Trapezoidal Rule")
            st.write("""
            Uses trapezoids to approximate volume between sections.
            
            **Formula:**
            V = (h/2) × [A₀ + 2A₁ + 2A₂ + ... + 2Aₙ₋₁ + Aₙ]
            
            **When to use:**
            - Simple approximation
            - Linear variation between sections
            
            **Pros:** Simple and fast
            **Cons:** Less accurate for curved surfaces
            """)
        
        with col2:
            st.subheader("Simpson's 1/3 Rule")
            st.write("""
            Uses parabolic sections for accurate approximation.
            Uses different coefficients for odd and even positions.
            
            **Formula:**
            V = (h/3) × [A₀ + 4A₁ + 2A₂ + 4A₃ + ... + 2Aₙ₋₂ + 4Aₙ₋₁ + Aₙ]
            
            **Requirements:**
            - Odd number of cross-sections
            - Uniform spacing (h) between sections
            
            **Pros:** More accurate than trapezoidal
            **Cons:** Requires odd number of sections
            """)
        
        col3, col4 = st.columns(2)
        
        with col3:
            st.subheader("Simpson's 3/8 Rule")
            st.write("""
            Uses cubic polynomials for highest accuracy.
            Most accurate for smooth curves and variations.
            
            **Formula:**
            V = (3h/8) × [A₀ + 3A₁ + 3A₂ + 2A₃ + ...]
            
            **Requirements:**
            - Number of intervals divisible by 3
            - Uniform spacing between sections
            
            **Pros:** Most accurate for smooth variations
            **Cons:** Requires specific number of sections
            """)
        
        with col4:
            st.subheader("Pyramidal Rule")
            st.write("""
            Uses pyramid/cone approximation between sections.
            Accounts for geometric mean between consecutive areas.
            
            **Formula:**
            V = Σ (h/3) × [Aᵢ + √(Aᵢ×Aᵢ₊₁) + Aᵢ₊₁]
            
            **When to use:**
            - Conical or pyramidal shapes
            - When geometric transition matters
            
            **Pros:** Mathematically precise for pyramidal shapes
            **Cons:** More computation required
            """)

else:
    st.info("👆 Please enter or upload data to calculate volumes")

# Footer
st.divider()
st.markdown("""
**How to use this calculator:**
1. Select your preferred input method
2. Enter cross-sectional areas
3. View calculations and comparisons
4. Analyze visualizations
""")
