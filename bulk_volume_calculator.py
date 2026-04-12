import streamlit as st
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import integrate

st.set_page_config(page_title="Bulk Volume Calculator", layout="wide")

st.title("📦 Bulk Volume Calculator")
st.write("Calculate volume using Trapezoidal, Pyramid (Simpson's 1/3), and Simpson's 3/8 methods")

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
    """Calculate volume using Trapezoidal Rule"""
    if len(cross_sections) < 2:
        return None
    total = 0
    for i in range(len(cross_sections) - 1):
        total += (cross_sections[i] + cross_sections[i + 1]) / 2 * heights[i]
    return total

def pyramid_rule(heights, cross_sections):
    """Calculate volume using Pyramid Rule (Simpson's 1/3)"""
    if len(cross_sections) < 3:
        return None
    if len(cross_sections) % 2 == 0:
        return None  # Need odd number of sections
    
    h = heights[0]  # Assuming equal heights
    total = cross_sections[0] + cross_sections[-1]
    
    # Add 4 times the odd-indexed sections
    for i in range(1, len(cross_sections) - 1, 2):
        total += 4 * cross_sections[i]
    
    # Add 2 times the even-indexed sections
    for i in range(2, len(cross_sections) - 1, 2):
        total += 2 * cross_sections[i]
    
    return (h / 3) * total

def simpsons_38_rule(heights, cross_sections):
    """Calculate volume using Simpson's 3/8 Rule"""
    if len(cross_sections) < 4:
        return None
    
    h = heights[0] if len(set(heights)) == 1 else np.mean(heights)
    total = 0
    
    # Simpson's 3/8 requires number of intervals divisible by 3
    n = len(cross_sections) - 1
    if n % 3 != 0:
        # Use composite Simpson's 3/8
        pass
    
    for i in range(0, len(cross_sections) - 3, 3):
        total += (3 * h / 8) * (cross_sections[i] + 3 * cross_sections[i + 1] + 
                                3 * cross_sections[i + 2] + cross_sections[i + 3])
    
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
    vol_pyramid = pyramid_rule(heights, cross_sections) if len(cross_sections) % 2 == 1 else None
    vol_simpson = simpsons_38_rule(heights, cross_sections)
    
    # Results Table
    col1, col2, col3 = st.columns(3)
    
    results = []
    if vol_trap is not None:
        results.append({"Method": "Trapezoidal Rule", "Volume (m³)": f"{vol_trap:.2f}"})
        col1.metric("Trapezoidal Rule", f"{vol_trap:.2f} m³", delta=None)
    
    if vol_pyramid is not None:
        results.append({"Method": "Pyramid Rule (Simpson's 1/3)", "Volume (m³)": f"{vol_pyramid:.2f}"})
        col2.metric("Pyramid Rule", f"{vol_pyramid:.2f} m³", delta=None)
    
    if vol_simpson is not None:
        results.append({"Method": "Simpson's 3/8 Rule", "Volume (m³)": f"{vol_simpson:.2f}"})
        col3.metric("Simpson's 3/8 Rule", f"{vol_simpson:.2f} m³", delta=None)
    
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
        if vol_pyramid is not None:
            methods.append("Pyramid")
            volumes.append(vol_pyramid)
            colors_list.append('#ff7f0e')
        if vol_simpson is not None:
            methods.append("Simpson's 3/8")
            volumes.append(vol_simpson)
            colors_list.append('#2ca02c')
        
        if methods:
            fig, ax = plt.subplots(figsize=(10, 5))
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
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.subheader("Trapezoidal Rule")
            st.write("""
            Uses trapezoids to approximate the area under a curve.
            
            Formula:
            V = (h/2) × [A₀ + 2A₁ + 2A₂ + ... + Aₙ]
            
            **Pros:** Simple and fast
            **Cons:** Less accurate for curved surfaces
            """)
        
        with col2:
            st.subheader("Pyramid Rule (Simpson's 1/3)")
            st.write("""
            Uses parabolic sections for better approximation.
            Requires odd number of sections.
            
            Formula:
            V = (h/3) × [A₀ + 4A₁ + 2A₂ + 4A₃ + ... + Aₙ]
            
            **Pros:** More accurate than trapezoidal
            **Cons:** Needs odd number of sections
            """)
        
        with col3:
            st.subheader("Simpson's 3/8 Rule")
            st.write("""
            Uses cubic polynomials for highest accuracy.
            Most accurate for smooth curves.
            
            Formula:
            V = (3h/8) × [A₀ + 3A₁ + 3A₂ + 2A₃ + ...]
            
            **Pros:** Most accurate
            **Cons:** More complex calculation
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
