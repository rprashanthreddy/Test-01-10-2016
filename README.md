# SmartCalc & Unit Converter 🧮

A modern, fast, responsive web application combining an advanced scientific calculator with an interactive real-time unit converter. Zero dependencies — runs immediately in any web browser.

---

## ✨ Features

### 1. Smart Calculator
- **Dual Mode**: Standard keypad and expandable Scientific pad (trigonometry `sin`/`cos`/`tan` with DEG/RAD support, logarithms `log`/`ln`, powers, square root `√`, factorial `n!`, constants $\pi$ and $e$).
- **Live Preview**: See continuous expression results as you type before hitting equals (`=`).
- **Calculation History**: Automatic timestamped history drawer stored locally. Click any past calculation to restore or inspect.
- **Memory Functions**: `MC`, `MR`, `M+`, `M-`, and `MS` with visual indicator.
- **Keyboard Navigation**:
  - `0`–`9`, `.` : Number entry
  - `+`, `-`, `*`, `/`, `^`, `%` : Arithmetic operations
  - `(` and `)` : Parentheses grouping
  - `Enter` or `=` : Calculate result
  - `Backspace` : Delete last character
  - `Escape` or `c` : Clear all (`AC`)
  - `Tab` : Switch between Calculator & Converter

### 2. Real-Time Unit Converter
- **8 Comprehensive Categories**:
  - **Length**: Millimeters, Centimeters, Meters, Kilometers, Inches, Feet, Yards, Miles, Nautical Miles
  - **Mass & Weight**: Milligrams, Grams, Kilograms, Metric Tons, Ounces, Pounds, Stone
  - **Temperature**: Celsius (°C), Fahrenheit (°F), Kelvin (K)
  - **Digital Data**: Bits, Bytes, KB, MB, GB, TB, PB
  - **Speed**: m/s, km/h, mph, knots, ft/s
  - **Time**: Milliseconds, Seconds, Minutes, Hours, Days, Weeks, Years
  - **Area**: m², km², ft², yd², Acres, Hectares
  - **Volume**: Milliliters, Liters, m³, Gallons, Quarts, Pints, Cups, Fluid Ounces
- **Two-Way Conversion**: Edit either field and the counterpart updates instantly.
- **Quick Swap (`⇄`)**: One-click unit inversion with smooth animation.
- **Formulas & Milestones**: Explanatory formula breakdown and clickable common milestones.

### 3. Modern Design & Accessibility
- **Theme Support**: Seamless toggle between Dark and Light themes with persistent state.
- **Audio Feedback**: Subtle synthesized tactile audio cues (via Web Audio API) with mute toggle.
- **One-Click Copy**: Copy results directly to the clipboard with toast feedback.
- **Responsive Layout**: Designed for mobile phones, tablets, and desktop displays.

---

## 🚀 How to Run

No installations, build steps, or dependencies required!

### Option A: Open directly in your browser
Simply double-click [`index.html`](file:///C:/Users/prash/.gemini/antigravity/scratch/smart-calc-converter/index.html) or open it via file explorer.

### Option B: Using a local web server (PowerShell)
You can launch a lightweight local server if desired:
```powershell
python -m http.server 8000 --directory "C:\Users\prash\.gemini\antigravity\scratch\smart-calc-converter"
```
Then visit `http://localhost:8000` in your web browser.
