/**
 * SmartCalc & Unit Converter - Application Logic
 * Pure modern vanilla JavaScript (Zero dependencies)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Audio Feedback (Web Audio API Synthesizer)
  // =========================================================================
  class SoundFeedback {
    constructor() {
      this.enabled = localStorage.getItem('smartcalc_sound') !== 'false';
      this.audioCtx = null;
      this.initButton();
    }

    initContext() {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    playClick(freq = 600, duration = 0.04, type = 'sine') {
      if (!this.enabled) return;
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) {
        // Audio might be blocked until user gesture
      }
    }

    playOperator() {
      this.playClick(850, 0.05, 'triangle');
    }

    playEquals() {
      this.playClick(1050, 0.07, 'sine');
    }

    playClear() {
      this.playClick(400, 0.06, 'sawtooth');
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('smartcalc_sound', this.enabled);
      this.updateUI();
      if (this.enabled) this.playClick(750, 0.05);
      return this.enabled;
    }

    initButton() {
      this.updateUI();
      const btn = document.getElementById('soundToggleBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          const newState = this.toggle();
          showToast(newState ? 'Sound feedback ON' : 'Sound feedback OFF');
        });
      }
    }

    updateUI() {
      const onIcon = document.querySelector('.sound-on-icon');
      const offIcon = document.querySelector('.sound-off-icon');
      if (onIcon && offIcon) {
        if (this.enabled) {
          onIcon.classList.remove('hidden');
          offIcon.classList.add('hidden');
        } else {
          onIcon.classList.add('hidden');
          offIcon.classList.remove('hidden');
        }
      }
    }
  }

  const sound = new SoundFeedback();

  // =========================================================================
  // 2. Theme Manager
  // =========================================================================
  class ThemeManager {
    constructor() {
      const savedTheme = localStorage.getItem('smartcalc_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.theme = savedTheme || (prefersDark ? 'dark' : 'light');
      this.applyTheme(this.theme);
      this.initEvents();
    }

    applyTheme(theme) {
      document.body.setAttribute('data-theme', theme);
      localStorage.setItem('smartcalc_theme', theme);
      const sunIcon = document.querySelector('.sun-icon');
      const moonIcon = document.querySelector('.moon-icon');
      if (sunIcon && moonIcon) {
        if (theme === 'dark') {
          sunIcon.classList.remove('hidden');
          moonIcon.classList.add('hidden');
        } else {
          sunIcon.classList.add('hidden');
          moonIcon.classList.remove('hidden');
        }
      }
    }

    toggle() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme(this.theme);
      sound.playClick(900, 0.05);
      showToast(`Switched to ${this.theme} theme`);
    }

    initEvents() {
      const btn = document.getElementById('themeToggleBtn');
      if (btn) {
        btn.addEventListener('click', () => this.toggle());
      }
    }
  }

  new ThemeManager();

  // =========================================================================
  // 3. Navigation Tabs
  // =========================================================================
  const tabButtons = document.querySelectorAll('.tab-button');
  const viewPanels = {
    calculator: document.getElementById('calculatorView'),
    converter: document.getElementById('converterView')
  };

  function switchTab(targetTab) {
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === targetTab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    Object.entries(viewPanels).forEach(([name, panel]) => {
      if (panel) {
        panel.classList.toggle('active', name === targetTab);
      }
    });

    sound.playClick(680, 0.04);
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // =========================================================================
  // 4. Toast Notifications
  // =========================================================================
  let toastTimer = null;
  function showToast(message, duration = 2200) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // Helper to copy text with toast
  function copyTextToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (!text || text === '0') return;
    navigator.clipboard.writeText(text).then(() => {
      sound.playClick(1000, 0.04);
      showToast(successMsg);
    }).catch(() => {
      showToast('Could not copy to clipboard');
    });
  }

  // =========================================================================
  // 5. Calculator Engine
  // =========================================================================
  class Calculator {
    constructor() {
      this.expression = '';
      this.currentInput = '0';
      this.justCalculated = false;
      this.angleMode = 'DEG'; // DEG or RAD
      this.memory = 0;
      this.history = JSON.parse(localStorage.getItem('smartcalc_history') || '[]');

      this.dom = {
        mainValue: document.getElementById('calcMainValue'),
        expression: document.getElementById('calcExpression'),
        preview: document.getElementById('calcPreview'),
        angleModeBtn: document.getElementById('angleModeBtn'),
        sciToggleBtn: document.getElementById('scientificToggleBtn'),
        sciPad: document.getElementById('scientificPad'),
        memoryIndicator: document.getElementById('memoryIndicator'),
        copyBtn: document.getElementById('copyResultBtn'),
        historyDrawer: document.getElementById('historyDrawer'),
        historyBackdrop: document.getElementById('historyBackdrop'),
        historyToggleBtn: document.getElementById('historyToggleBtn'),
        closeHistoryBtn: document.getElementById('closeHistoryBtn'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        historyList: document.getElementById('historyList'),
        historyBadge: document.getElementById('historyBadge')
      };

      this.initEvents();
      this.render();
      this.renderHistory();
      this.updateMemoryIndicator();
    }

    initEvents() {
      // Keypad clicks (delegated)
      const keypad = document.querySelector('.calculator-card');
      if (keypad) {
        keypad.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;

          if (btn.dataset.num !== undefined) {
            sound.playClick(580, 0.03);
            this.handleNumber(btn.dataset.num);
          } else if (btn.dataset.op !== undefined) {
            sound.playOperator();
            this.handleOperator(btn.dataset.op);
          } else if (btn.dataset.action !== undefined) {
            this.handleAction(btn.dataset.action);
          } else if (btn.dataset.fn !== undefined) {
            sound.playOperator();
            this.handleFunction(btn.dataset.fn);
          } else if (btn.dataset.const !== undefined) {
            sound.playClick(650, 0.04);
            this.handleConstant(btn.dataset.const);
          } else if (btn.dataset.insert !== undefined) {
            sound.playClick(650, 0.04);
            this.handleInsert(btn.dataset.insert);
          }
        });
      }

      // Angle Mode Toggle
      if (this.dom.angleModeBtn) {
        this.dom.angleModeBtn.addEventListener('click', () => {
          this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
          this.dom.angleModeBtn.textContent = this.angleMode;
          this.dom.angleModeBtn.dataset.mode = this.angleMode;
          sound.playClick(800, 0.04);
          this.updatePreview();
        });
      }

      // Scientific Pad Toggle
      if (this.dom.sciToggleBtn && this.dom.sciPad) {
        this.dom.sciToggleBtn.addEventListener('click', () => {
          const isCollapsed = this.dom.sciPad.classList.toggle('collapsed');
          this.dom.sciToggleBtn.classList.toggle('expanded', !isCollapsed);
          sound.playClick(720, 0.04);
        });
      }

      // Copy Result Button
      if (this.dom.copyBtn) {
        this.dom.copyBtn.addEventListener('click', () => {
          copyTextToClipboard(this.currentInput, `Copied ${this.currentInput}`);
        });
      }

      // History Drawer Events
      if (this.dom.historyToggleBtn) {
        this.dom.historyToggleBtn.addEventListener('click', () => this.toggleHistory(true));
      }
      if (this.dom.closeHistoryBtn) {
        this.dom.closeHistoryBtn.addEventListener('click', () => this.toggleHistory(false));
      }
      if (this.dom.historyBackdrop) {
        this.dom.historyBackdrop.addEventListener('click', () => this.toggleHistory(false));
      }
      if (this.dom.clearHistoryBtn) {
        this.dom.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
      }

      // Global Keyboard shortcuts
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleKeyDown(e) {
      // Don't intercept if user is typing in converter inputs
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      const key = e.key;

      if (!isNaN(key) && key !== ' ') {
        sound.playClick(580, 0.03);
        this.handleNumber(key);
      } else if (['+', '-', '*', '/'].includes(key)) {
        e.preventDefault();
        sound.playOperator();
        const map = { '*': '×', '/': '÷', '-': '−', '+': '+' };
        this.handleOperator(map[key]);
      } else if (key === '%') {
        sound.playOperator();
        this.handleOperator('%');
      } else if (key === '^') {
        sound.playOperator();
        this.handleOperator('^');
      } else if (key === '.' || key === ',') {
        sound.playClick(580, 0.03);
        this.handleAction('decimal');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        this.handleAction('equals');
      } else if (key === 'Backspace') {
        e.preventDefault();
        this.handleAction('delete');
      } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        e.preventDefault();
        this.handleAction('clear');
      } else if (key === '(' || key === ')') {
        sound.playClick(650, 0.04);
        this.handleInsert(key);
      } else if (key === 'Tab') {
        // Toggle tab
        e.preventDefault();
        const activeTab = document.querySelector('.tab-button.active').dataset.tab;
        switchTab(activeTab === 'calculator' ? 'converter' : 'calculator');
      }
    }

    handleNumber(num) {
      if (this.justCalculated) {
        this.currentInput = num;
        this.expression = '';
        this.justCalculated = false;
      } else {
        if (this.currentInput === '0') {
          this.currentInput = num;
        } else {
          this.currentInput += num;
        }
      }
      this.render();
      this.updatePreview();
    }

    handleOperator(op) {
      this.justCalculated = false;
      
      // If currentInput has a value, commit it to expression
      if (this.currentInput !== '') {
        this.expression += ` ${this.currentInput} ${op}`;
        this.currentInput = '';
      } else if (this.expression !== '') {
        // Replace the last operator if consecutive operator clicked
        this.expression = this.expression.trim().replace(/[\+\−\×\÷\%\^]+$/, op);
      }
      this.render();
      this.updatePreview();
    }

    handleInsert(str) {
      this.justCalculated = false;
      if (str === '(') {
        if (this.currentInput !== '' && this.currentInput !== '0') {
          this.expression += ` ${this.currentInput} × (`;
        } else {
          this.expression += ' (';
        }
        this.currentInput = '';
      } else if (str === ')') {
        if (this.currentInput !== '') {
          this.expression += ` ${this.currentInput} )`;
          this.currentInput = '';
        } else {
          this.expression += ' )';
        }
      }
      this.render();
      this.updatePreview();
    }

    handleConstant(name) {
      this.justCalculated = false;
      const val = name === 'pi' ? String(Math.PI) : String(Math.E);
      this.currentInput = val;
      this.render();
      this.updatePreview();
    }

    handleAction(action) {
      switch (action) {
        case 'clear':
          sound.playClear();
          this.expression = '';
          this.currentInput = '0';
          this.justCalculated = false;
          this.dom.preview.textContent = '';
          break;

        case 'delete':
          sound.playClick(450, 0.03);
          if (this.justCalculated) {
            this.expression = '';
            this.justCalculated = false;
          } else if (this.currentInput.length > 1) {
            this.currentInput = this.currentInput.slice(0, -1);
          } else {
            this.currentInput = '0';
          }
          break;

        case 'decimal':
          if (this.justCalculated) {
            this.currentInput = '0.';
            this.expression = '';
            this.justCalculated = false;
          } else if (!this.currentInput.includes('.')) {
            this.currentInput += '.';
          }
          break;

        case 'negate':
          sound.playClick(600, 0.03);
          if (this.currentInput !== '0' && this.currentInput !== '') {
            if (this.currentInput.startsWith('-')) {
              this.currentInput = this.currentInput.substring(1);
            } else {
              this.currentInput = '-' + this.currentInput;
            }
          }
          break;

        case 'equals':
          this.evaluate();
          break;

        // Memory actions
        case 'mc':
          sound.playClick(500, 0.04);
          this.memory = 0;
          this.updateMemoryIndicator();
          showToast('Memory Cleared (0)');
          break;

        case 'mr':
          sound.playClick(600, 0.04);
          this.currentInput = String(this.memory);
          this.justCalculated = true;
          showToast(`Recalled: ${this.memory}`);
          break;

        case 'm-plus':
          sound.playClick(650, 0.04);
          this.memory += parseFloat(this.currentInput || '0') || 0;
          this.updateMemoryIndicator();
          showToast(`Memory: ${this.memory}`);
          break;

        case 'm-minus':
          sound.playClick(650, 0.04);
          this.memory -= parseFloat(this.currentInput || '0') || 0;
          this.updateMemoryIndicator();
          showToast(`Memory: ${this.memory}`);
          break;

        case 'ms':
          sound.playClick(650, 0.04);
          this.memory = parseFloat(this.currentInput || '0') || 0;
          this.updateMemoryIndicator();
          showToast(`Stored in Memory: ${this.memory}`);
          break;
      }
      this.render();
      this.updatePreview();
    }

    handleFunction(fn) {
      const val = parseFloat(this.currentInput || '0');
      let result;

      switch (fn) {
        case 'sin':
          const radSin = this.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
          result = Math.sin(radSin);
          break;
        case 'cos':
          const radCos = this.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
          result = Math.cos(radCos);
          break;
        case 'tan':
          const radTan = this.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
          result = Math.tan(radTan);
          break;
        case 'log':
          result = val > 0 ? Math.log10(val) : NaN;
          break;
        case 'ln':
          result = val > 0 ? Math.log(val) : NaN;
          break;
        case 'sqrt':
          result = val >= 0 ? Math.sqrt(val) : NaN;
          break;
        case 'square':
          result = val * val;
          break;
        case 'fact':
          result = this.factorial(val);
          break;
        case 'inv':
          result = val !== 0 ? 1 / val : NaN;
          break;
        case 'abs':
          result = Math.abs(val);
          break;
      }

      if (isNaN(result)) {
        showToast('Invalid Operation');
        return;
      }

      result = this.formatNumber(result);
      this.expression = `${fn}(${val}) =`;
      this.currentInput = String(result);
      this.justCalculated = true;
      this.addHistory(`${fn}(${val})`, result);
      this.render();
    }

    factorial(n) {
      if (n < 0 || !Number.isInteger(n)) return NaN;
      if (n > 170) return Infinity; // JS numeric limit
      let res = 1;
      for (let i = 2; i <= n; i++) res *= i;
      return res;
    }

    formatNumber(num) {
      if (!isFinite(num)) return 'Error';
      // Fix IEEE 754 precision issues (e.g. 0.1 + 0.2 = 0.3)
      const rounded = Number(Math.round(num + 'e12') + 'e-12');
      if (Math.abs(rounded) < 1e-12 && rounded !== 0) return '0';
      return rounded;
    }

    buildFullExpression() {
      let full = this.expression;
      if (this.currentInput !== '') {
        full += ' ' + this.currentInput;
      }
      return full.trim();
    }

    sanitizeAndEvaluate(expr) {
      if (!expr) return null;

      // Transform display symbols to JS arithmetic operators
      let sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/\^/g, '**')
        .replace(/π/g, `(${Math.PI})`)
        .replace(/e/g, `(${Math.E})`);

      // Handle percentage: number% => (number/100)
      sanitized = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

      // Check balance of parentheses
      const openCount = (sanitized.match(/\(/g) || []).length;
      const closeCount = (sanitized.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        sanitized += ')'.repeat(openCount - closeCount);
      }

      // Check for illegal characters
      if (/[^0-9\+\-\*\/\.\(\)\s\*\*%]/.test(sanitized)) {
        return null;
      }

      try {
        // Safe evaluation with Function limited to mathematical expression
        const fn = new Function(`'use strict'; return (${sanitized})`);
        const res = fn();
        if (typeof res === 'number' && isFinite(res)) {
          return this.formatNumber(res);
        }
        return null;
      } catch (e) {
        return null;
      }
    }

    updatePreview() {
      const expr = this.buildFullExpression();
      if (!expr || expr.endsWith('+') || expr.endsWith('−') || expr.endsWith('×') || expr.endsWith('÷') || expr.endsWith('^')) {
        this.dom.preview.textContent = '';
        return;
      }

      const res = this.sanitizeAndEvaluate(expr);
      if (res !== null && String(res) !== this.currentInput) {
        this.dom.preview.textContent = `= ${res}`;
      } else {
        this.dom.preview.textContent = '';
      }
    }

    evaluate() {
      const expr = this.buildFullExpression();
      if (!expr) return;

      const result = this.sanitizeAndEvaluate(expr);

      if (result === null) {
        showToast('Invalid Expression');
        sound.playClear();
        return;
      }

      sound.playEquals();
      this.addHistory(expr, result);

      this.expression = expr + ' =';
      this.currentInput = String(result);
      this.justCalculated = true;
      this.dom.preview.textContent = '';
      this.render();
    }

    updateMemoryIndicator() {
      if (this.dom.memoryIndicator) {
        if (this.memory !== 0) {
          this.dom.memoryIndicator.classList.remove('hidden');
        } else {
          this.dom.memoryIndicator.classList.add('hidden');
        }
      }
    }

    render() {
      this.dom.expression.textContent = this.expression;
      this.dom.mainValue.textContent = this.currentInput || '0';

      // Dynamic font size scaling for long values
      const len = (this.currentInput || '0').length;
      if (len > 14) {
        this.dom.mainValue.style.fontSize = '1.35rem';
      } else if (len > 10) {
        this.dom.mainValue.style.fontSize = '1.75rem';
      } else {
        this.dom.mainValue.style.fontSize = '2.3rem';
      }
    }

    // History methods
    addHistory(expr, result) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.history.unshift({ expr, result, time: timeStr });
      if (this.history.length > 30) this.history.pop();
      localStorage.setItem('smartcalc_history', JSON.stringify(this.history));
      this.renderHistory();
    }

    clearHistory() {
      this.history = [];
      localStorage.removeItem('smartcalc_history');
      this.renderHistory();
      sound.playClear();
      showToast('History cleared');
    }

    toggleHistory(open) {
      if (open) {
        this.dom.historyDrawer.classList.add('open');
        this.dom.historyBackdrop.classList.add('open');
        this.dom.historyDrawer.setAttribute('aria-hidden', 'false');
      } else {
        this.dom.historyDrawer.classList.remove('open');
        this.dom.historyBackdrop.classList.remove('open');
        this.dom.historyDrawer.setAttribute('aria-hidden', 'true');
      }
      sound.playClick(600, 0.04);
    }

    renderHistory() {
      const count = this.history.length;
      if (this.dom.historyBadge) {
        if (count > 0) {
          this.dom.historyBadge.textContent = count;
          this.dom.historyBadge.classList.remove('hidden');
        } else {
          this.dom.historyBadge.classList.add('hidden');
        }
      }

      if (!this.dom.historyList) return;

      if (count === 0) {
        this.dom.historyList.innerHTML = `
          <div class="history-empty">
            <div class="empty-icon">📝</div>
            <p>No calculations yet</p>
            <span>Calculations you perform will appear here for quick reuse.</span>
          </div>
        `;
        return;
      }

      this.dom.historyList.innerHTML = this.history.map((item, idx) => `
        <div class="history-item" data-idx="${idx}" title="Click to use this result">
          <div class="history-item-exp">${item.expr}</div>
          <div class="history-item-res">${item.result}</div>
          <div class="history-item-time">${item.time}</div>
        </div>
      `).join('');

      // Attach click listeners to history items
      this.dom.historyList.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
          const idx = el.dataset.idx;
          const item = this.history[idx];
          if (item) {
            this.currentInput = String(item.result);
            this.expression = '';
            this.justCalculated = true;
            this.render();
            this.toggleHistory(false);
            sound.playClick(750, 0.04);
            showToast(`Loaded ${item.result}`);
          }
        });
      });
    }
  }

  // =========================================================================
  // 6. Unit Converter Engine
  // =========================================================================
  class UnitConverter {
    constructor() {
      this.category = 'length';
      this.fromUnit = 'm';
      this.toUnit = 'ft';

      // Comprehensive Conversion Definitions
      this.definitions = {
        length: {
          name: 'Length',
          baseUnit: 'm',
          units: {
            mm: { label: 'Millimeters (mm)', factor: 0.001 },
            cm: { label: 'Centimeters (cm)', factor: 0.01 },
            m: { label: 'Meters (m)', factor: 1 },
            km: { label: 'Kilometers (km)', factor: 1000 },
            in: { label: 'Inches (in)', factor: 0.0254 },
            ft: { label: 'Feet (ft)', factor: 0.3048 },
            yd: { label: 'Yards (yd)', factor: 0.9144 },
            mi: { label: 'Miles (mi)', factor: 1609.344 },
            nmi: { label: 'Nautical Miles (nmi)', factor: 1852 }
          },
          milestones: [
            { from: '1 km', fromVal: 1, fromU: 'km', toVal: 0.621371, toU: 'mi', to: '0.62 mi' },
            { from: '1 mi', fromVal: 1, fromU: 'mi', toVal: 1.60934, toU: 'km', to: '1.61 km' },
            { from: '1 m', fromVal: 1, fromU: 'm', toVal: 3.28084, toU: 'ft', to: '3.28 ft' },
            { from: '1 ft', fromVal: 1, fromU: 'ft', toVal: 30.48, toU: 'cm', to: '30.48 cm' }
          ]
        },
        mass: {
          name: 'Mass & Weight',
          baseUnit: 'g',
          units: {
            mg: { label: 'Milligrams (mg)', factor: 0.001 },
            g: { label: 'Grams (g)', factor: 1 },
            kg: { label: 'Kilograms (kg)', factor: 1000 },
            t: { label: 'Metric Tons (t)', factor: 1000000 },
            oz: { label: 'Ounces (oz)', factor: 28.349523 },
            lb: { label: 'Pounds (lb)', factor: 453.59237 },
            st: { label: 'Stone (st)', factor: 6350.293 }
          },
          milestones: [
            { from: '1 kg', fromVal: 1, fromU: 'kg', toVal: 2.20462, toU: 'lb', to: '2.20 lb' },
            { from: '1 lb', fromVal: 1, fromU: 'lb', toVal: 453.59, toU: 'g', to: '453.6 g' },
            { from: '1 oz', fromVal: 1, fromU: 'oz', toVal: 28.35, toU: 'g', to: '28.35 g' },
            { from: '1 t', fromVal: 1, fromU: 't', toVal: 1000, toU: 'kg', to: '1000 kg' }
          ]
        },
        temperature: {
          name: 'Temperature',
          isTemperature: true,
          units: {
            c: { label: 'Celsius (°C)' },
            f: { label: 'Fahrenheit (°F)' },
            k: { label: 'Kelvin (K)' }
          },
          milestones: [
            { from: '0 °C (Freeze)', fromVal: 0, fromU: 'c', toVal: 32, toU: 'f', to: '32 °F' },
            { from: '20 °C (Room)', fromVal: 20, fromU: 'c', toVal: 68, toU: 'f', to: '68 °F' },
            { from: '37 °C (Body)', fromVal: 37, fromU: 'c', toVal: 98.6, toU: 'f', to: '98.6 °F' },
            { from: '100 °C (Boil)', fromVal: 100, fromU: 'c', toVal: 212, toU: 'f', to: '212 °F' }
          ]
        },
        digital: {
          name: 'Digital Data',
          baseUnit: 'B',
          units: {
            b: { label: 'Bits (b)', factor: 0.125 },
            B: { label: 'Bytes (B)', factor: 1 },
            KB: { label: 'Kilobytes (KB)', factor: 1024 },
            MB: { label: 'Megabytes (MB)', factor: 1024 ** 2 },
            GB: { label: 'Gigabytes (GB)', factor: 1024 ** 3 },
            TB: { label: 'Terabytes (TB)', factor: 1024 ** 4 },
            PB: { label: 'Petabytes (PB)', factor: 1024 ** 5 }
          },
          milestones: [
            { from: '1 GB', fromVal: 1, fromU: 'GB', toVal: 1024, toU: 'MB', to: '1,024 MB' },
            { from: '1 TB', fromVal: 1, fromU: 'TB', toVal: 1024, toU: 'GB', to: '1,024 GB' },
            { from: '1 MB', fromVal: 1, fromU: 'MB', toVal: 1024, toU: 'KB', to: '1,024 KB' },
            { from: '1 Byte', fromVal: 1, fromU: 'B', toVal: 8, toU: 'b', to: '8 Bits' }
          ]
        },
        speed: {
          name: 'Speed',
          baseUnit: 'mps',
          units: {
            mps: { label: 'Meters/sec (m/s)', factor: 1 },
            kmh: { label: 'Kilometers/hour (km/h)', factor: 0.27777778 },
            mph: { label: 'Miles/hour (mph)', factor: 0.44704 },
            knot: { label: 'Knots (kn)', factor: 0.514444 },
            fts: { label: 'Feet/sec (ft/s)', factor: 0.3048 }
          },
          milestones: [
            { from: '100 km/h', fromVal: 100, fromU: 'kmh', toVal: 62.137, toU: 'mph', to: '62.14 mph' },
            { from: '60 mph', fromVal: 60, fromU: 'mph', toVal: 96.56, toU: 'kmh', to: '96.56 km/h' },
            { from: '10 m/s', fromVal: 10, fromU: 'mps', toVal: 36, toU: 'kmh', to: '36 km/h' },
            { from: '1 knot', fromVal: 1, fromU: 'knot', toVal: 1.15078, toU: 'mph', to: '1.15 mph' }
          ]
        },
        time: {
          name: 'Time',
          baseUnit: 's',
          units: {
            ms: { label: 'Milliseconds (ms)', factor: 0.001 },
            s: { label: 'Seconds (s)', factor: 1 },
            min: { label: 'Minutes (min)', factor: 60 },
            hr: { label: 'Hours (h)', factor: 3600 },
            day: { label: 'Days (d)', factor: 86400 },
            wk: { label: 'Weeks (wk)', factor: 604800 },
            yr: { label: 'Years (yr, 365d)', factor: 31536000 }
          },
          milestones: [
            { from: '1 Hour', fromVal: 1, fromU: 'hr', toVal: 60, toU: 'min', to: '60 min' },
            { from: '1 Day', fromVal: 1, fromU: 'day', toVal: 24, toU: 'hr', to: '24 hr' },
            { from: '1 Week', fromVal: 1, fromU: 'wk', toVal: 168, toU: 'hr', to: '168 hr' },
            { from: '1 Year', fromVal: 1, fromU: 'yr', toVal: 365, toU: 'day', to: '365 days' }
          ]
        },
        area: {
          name: 'Area',
          baseUnit: 'sqm',
          units: {
            sqm: { label: 'Square Meters (m²)', factor: 1 },
            sqkm: { label: 'Square Kilometers (km²)', factor: 1000000 },
            sqft: { label: 'Square Feet (ft²)', factor: 0.09290304 },
            sqyd: { label: 'Square Yards (yd²)', factor: 0.83612736 },
            ac: { label: 'Acres (ac)', factor: 4046.8564224 },
            ha: { label: 'Hectares (ha)', factor: 10000 }
          },
          milestones: [
            { from: '1 Acre', fromVal: 1, fromU: 'ac', toVal: 43560, toU: 'sqft', to: '43,560 ft²' },
            { from: '1 Hectare', fromVal: 1, fromU: 'ha', toVal: 2.47105, toU: 'ac', to: '2.47 ac' },
            { from: '1 km²', fromVal: 1, fromU: 'sqkm', toVal: 247.105, toU: 'ac', to: '247.1 ac' },
            { from: '100 m²', fromVal: 100, fromU: 'sqm', toVal: 1076.39, toU: 'sqft', to: '1,076 ft²' }
          ]
        },
        volume: {
          name: 'Volume',
          baseUnit: 'L',
          units: {
            mL: { label: 'Milliliters (mL)', factor: 0.001 },
            L: { label: 'Liters (L)', factor: 1 },
            cbm: { label: 'Cubic Meters (m³)', factor: 1000 },
            floz: { label: 'Fluid Ounces (fl oz)', factor: 0.0295735 },
            cup: { label: 'US Cups (cup)', factor: 0.236588 },
            pt: { label: 'US Pints (pt)', factor: 0.473176 },
            qt: { label: 'US Quarts (qt)', factor: 0.946353 },
            gal: { label: 'US Gallons (gal)', factor: 3.78541 }
          },
          milestones: [
            { from: '1 Gallon', fromVal: 1, fromU: 'gal', toVal: 3.78541, toU: 'L', to: '3.79 L' },
            { from: '1 Liter', fromVal: 1, fromU: 'L', toVal: 33.814, toU: 'floz', to: '33.8 fl oz' },
            { from: '1 Cup', fromVal: 1, fromU: 'cup', toVal: 236.59, toU: 'mL', to: '236.6 mL' },
            { from: '1 m³', fromVal: 1, fromU: 'cbm', toVal: 1000, toU: 'L', to: '1,000 L' }
          ]
        }
      };

      this.dom = {
        categoryPills: document.querySelectorAll('.category-pill'),
        fromInput: document.getElementById('fromValueInput'),
        toInput: document.getElementById('toValueInput'),
        fromSelect: document.getElementById('fromUnitSelect'),
        toSelect: document.getElementById('toUnitSelect'),
        swapBtn: document.getElementById('swapUnitsBtn'),
        clearFromBtn: document.getElementById('clearFromInput'),
        copyBtn: document.getElementById('copyConvertedBtn'),
        formulaText: document.getElementById('formulaText'),
        quickRefGrid: document.getElementById('quickRefGrid')
      };

      this.initEvents();
      this.populateUnits();
      this.convert('from');
    }

    initEvents() {
      // Category pills
      this.dom.categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
          this.dom.categoryPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.category = pill.dataset.category;
          this.populateUnits();
          this.convert('from');
          sound.playClick(700, 0.03);
        });
      });

      // From input change
      this.dom.fromInput.addEventListener('input', () => {
        this.convert('from');
      });

      // To input change (two-way conversion!)
      this.dom.toInput.addEventListener('input', () => {
        this.convert('to');
      });

      // Unit selects
      this.dom.fromSelect.addEventListener('change', () => {
        this.fromUnit = this.dom.fromSelect.value;
        this.convert('from');
        sound.playClick(600, 0.03);
      });

      this.dom.toSelect.addEventListener('change', () => {
        this.toUnit = this.dom.toSelect.value;
        this.convert('from');
        sound.playClick(600, 0.03);
      });

      // Swap button
      this.dom.swapBtn.addEventListener('click', () => {
        const tempUnit = this.fromUnit;
        this.fromUnit = this.toUnit;
        this.toUnit = tempUnit;

        this.dom.fromSelect.value = this.fromUnit;
        this.dom.toSelect.value = this.toUnit;

        sound.playClick(850, 0.05);
        this.convert('from');
      });

      // Clear input button
      this.dom.clearFromBtn.addEventListener('click', () => {
        this.dom.fromInput.value = '';
        this.dom.toInput.value = '';
        this.dom.fromInput.focus();
        sound.playClick(400, 0.03);
      });

      // Copy converted value
      this.dom.copyBtn.addEventListener('click', () => {
        copyTextToClipboard(this.dom.toInput.value, `Copied ${this.dom.toInput.value}`);
      });
    }

    populateUnits() {
      const catData = this.definitions[this.category];
      const unitKeys = Object.keys(catData.units);

      this.dom.fromSelect.innerHTML = unitKeys.map(k => `
        <option value="${k}">${catData.units[k].label}</option>
      `).join('');

      this.dom.toSelect.innerHTML = unitKeys.map(k => `
        <option value="${k}">${catData.units[k].label}</option>
      `).join('');

      // Pick reasonable defaults
      this.fromUnit = unitKeys[0];
      this.toUnit = unitKeys.length > 1 ? unitKeys[1] : unitKeys[0];

      // Smart defaults per category
      if (this.category === 'length') {
        this.fromUnit = 'm';
        this.toUnit = 'ft';
      } else if (this.category === 'mass') {
        this.fromUnit = 'kg';
        this.toUnit = 'lb';
      } else if (this.category === 'temperature') {
        this.fromUnit = 'c';
        this.toUnit = 'f';
      } else if (this.category === 'digital') {
        this.fromUnit = 'GB';
        this.toUnit = 'MB';
      } else if (this.category === 'speed') {
        this.fromUnit = 'kmh';
        this.toUnit = 'mph';
      } else if (this.category === 'time') {
        this.fromUnit = 'hr';
        this.toUnit = 'min';
      }

      this.dom.fromSelect.value = this.fromUnit;
      this.dom.toSelect.value = this.toUnit;

      this.renderMilestones();
    }

    convert(source = 'from') {
      const catData = this.definitions[this.category];
      const inputEl = source === 'from' ? this.dom.fromInput : this.dom.toInput;
      const outputEl = source === 'from' ? this.dom.toInput : this.dom.fromInput;

      const rawVal = inputEl.value;
      if (rawVal === '' || isNaN(rawVal)) {
        outputEl.value = '';
        this.updateFormulaCard();
        return;
      }

      const val = parseFloat(rawVal);
      const fromU = source === 'from' ? this.fromUnit : this.toUnit;
      const toU = source === 'from' ? this.toUnit : this.fromUnit;

      let result;

      if (catData.isTemperature) {
        result = this.convertTemperature(val, fromU, toU);
      } else {
        const factorFrom = catData.units[fromU].factor;
        const factorTo = catData.units[toU].factor;
        // base = val * factorFrom; result = base / factorTo
        const base = val * factorFrom;
        result = base / factorTo;
      }

      outputEl.value = this.formatConverterResult(result);
      this.updateFormulaCard();
    }

    convertTemperature(val, from, to) {
      if (from === to) return val;
      // Convert source to Celsius first
      let c;
      if (from === 'c') c = val;
      else if (from === 'f') c = (val - 32) * (5 / 9);
      else if (from === 'k') c = val - 273.15;

      // Convert Celsius to target
      if (to === 'c') return c;
      if (to === 'f') return (c * 9 / 5) + 32;
      if (to === 'k') return c + 273.15;
      return val;
    }

    formatConverterResult(num) {
      if (!isFinite(num)) return '';
      // Clean display of precision without scientific notation when reasonable
      const rounded = Number(Math.round(num + 'e8') + 'e-8');
      if (Math.abs(rounded) > 1e12 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
        return rounded.toExponential(4);
      }
      return String(rounded);
    }

    updateFormulaCard() {
      const catData = this.definitions[this.category];
      const fromLabel = catData.units[this.fromUnit].label.split(' ')[0];
      const toLabel = catData.units[this.toUnit].label.split(' ')[0];

      if (catData.isTemperature) {
        if (this.fromUnit === 'c' && this.toUnit === 'f') {
          this.dom.formulaText.textContent = `°F = (°C × 9/5) + 32`;
        } else if (this.fromUnit === 'f' && this.toUnit === 'c') {
          this.dom.formulaText.textContent = `°C = (°F − 32) × 5/9`;
        } else if (this.fromUnit === 'c' && this.toUnit === 'k') {
          this.dom.formulaText.textContent = `K = °C + 273.15`;
        } else if (this.fromUnit === 'k' && this.toUnit === 'c') {
          this.dom.formulaText.textContent = `°C = K − 273.15`;
        } else {
          this.dom.formulaText.textContent = `1 ${this.fromUnit.toUpperCase()} to ${this.toUnit.toUpperCase()}`;
        }
        return;
      }

      const factorFrom = catData.units[this.fromUnit].factor;
      const factorTo = catData.units[this.toUnit].factor;
      const ratio = this.formatConverterResult(factorFrom / factorTo);

      this.dom.formulaText.textContent = `1 ${fromLabel} = ${ratio} ${toLabel}`;
    }

    renderMilestones() {
      const catData = this.definitions[this.category];
      if (!catData.milestones || !this.dom.quickRefGrid) return;

      this.dom.quickRefGrid.innerHTML = catData.milestones.map((m, idx) => `
        <div class="milestone-chip" data-idx="${idx}" title="Click to test this conversion">
          <span class="milestone-from">${m.from}</span>
          <span class="milestone-to">${m.to}</span>
        </div>
      `).join('');

      this.dom.quickRefGrid.querySelectorAll('.milestone-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const idx = chip.dataset.idx;
          const m = catData.milestones[idx];
          if (m) {
            this.fromUnit = m.fromU;
            this.toUnit = m.toU;
            this.dom.fromSelect.value = this.fromUnit;
            this.dom.toSelect.value = this.toUnit;
            this.dom.fromInput.value = m.fromVal;
            this.convert('from');
            sound.playClick(800, 0.04);
            showToast(`Loaded ${m.from} → ${m.to}`);
          }
        });
      });
    }
  }

  // =========================================================================
  // 7. Initialization
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    window.appCalc = new Calculator();
    window.appConverter = new UnitConverter();
  });

})();
