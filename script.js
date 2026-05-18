/* ═══════════════════════════════════════════════════════════
   CARDIOCORE HOSPITAL — script.js
   Handles: Navbar, Progress, Tooltips, Form Validation,
            Real ML API fetch, Result Modal & Gauge,
            Appointment Form & Confirmation Modal
═══════════════════════════════════════════════════════════ */

"use strict";

/* ── Utility ──────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ─────────────────────────────────────────────────────────
   1. NAVBAR — sticky shadow + mobile toggle + active links
───────────────────────────────────────────────────────── */
(function initNavbar() {
  const navbar   = $('#navbar');
  const toggle   = $('#navToggle');
  const links    = $('#navLinks');
  const navLinks = $$('.nav-link');

  if (!navbar || !toggle || !links) return;

  // Sticky shadow
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  // Mobile hamburger
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    const spans = $$('span', toggle);
    if (open) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });

  // Close mobile menu on link click
  links.addEventListener('click', e => {
    if (e.target.classList.contains('nav-link') || e.target.classList.contains('nav-cta-btn')) {
      links.classList.remove('open');
      const spans = $$('span', toggle);
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });

  // Active link on scroll
  const sections = ['home', 'doctors', 'assessment', 'appointment'];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const target = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (target) target.classList.add('active');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
})();

/* ─────────────────────────────────────────────────────────
   2. FORM PROGRESS BAR (predictor.html only)
───────────────────────────────────────────────────────── */
(function initProgress() {
  const form        = $('#heartRiskForm');
  const progressFill= $('#progressFill');
  const progressLbl = $('#progressLabel');
  if (!form || !progressFill || !progressLbl) return;

  const TOTAL = 13;

  function updateProgress() {
    const fields = $$('input, select', form);
    let filled = 0;
    fields.forEach(f => {
      const val = f.value.trim();
      if (val !== '' && val !== null) filled++;
    });
    const pct = Math.round((filled / TOTAL) * 100);
    progressFill.style.width = pct + '%';
    progressLbl.textContent  = `${filled} of ${TOTAL} completed`;
  }

  form.addEventListener('input', updateProgress);
  form.addEventListener('change', updateProgress);
})();

/* ─────────────────────────────────────────────────────────
   3. REAL-TIME FIELD VALIDATION (on blur)
───────────────────────────────────────────────────────── */
(function initValidation() {
  const formGroups = $$('.form-group');

  formGroups.forEach(group => {
    const input = group.querySelector('input, select');
    if (!input) return;

    input.addEventListener('blur', () => validateField(group, input));
    input.addEventListener('input', () => {
      if (group.classList.contains('has-error')) validateField(group, input);
    });
  });

  function validateField(group, input) {
    const val      = input.value.trim();
    const isEmpty  = val === '' || val === null;
    const isNum    = input.type === 'number';
    const isEmail  = input.type === 'email';
    const isTel    = input.type === 'tel';
    let   invalid  = false;

    if (isEmpty) {
      invalid = true;
    } else if (isNum) {
      const num = parseFloat(val);
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      if (isNaN(num)) invalid = true;
      if (!isNaN(min) && num < min) invalid = true;
      if (!isNaN(max) && num > max) invalid = true;
    } else if (isEmail) {
      invalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    } else if (isTel) {
      invalid = (val.replace(/\D/g, '').length < 7);
    }

    group.classList.toggle('has-error', invalid);
    group.classList.toggle('is-valid', !invalid && !isEmpty);
    return !invalid;
  }

  window._validateAll = function (formEl) {
    const scope = formEl || document;
    let allValid = true;
    $$('.form-group', scope).forEach(group => {
      const input = group.querySelector('input, select');
      if (!input) return;
      const ok = validateField(group, input);
      if (!ok) allValid = false;
    });
    return allValid;
  };
})();

/* ─────────────────────────────────────────────────────────
   4. TOOLTIPS
───────────────────────────────────────────────────────── */
(function initTooltips() {
  const bubble = $('#tooltipBubble');
  if (!bubble) return;

  document.addEventListener('mouseover', e => {
    const trigger = e.target.closest('.tooltip-trigger');
    if (!trigger) return;
    bubble.textContent = trigger.dataset.tip || '';
    bubble.classList.add('visible');
  });

  document.addEventListener('mouseout', e => {
    if (e.target.closest('.tooltip-trigger')) {
      bubble.classList.remove('visible');
    }
  });

  document.addEventListener('mousemove', e => {
    if (!bubble.classList.contains('visible')) return;
    const bw = bubble.offsetWidth;
    let x = e.clientX + 12;
    if (x + bw > window.innerWidth - 12) x = e.clientX - bw - 12;
    bubble.style.left = x + 'px';
    bubble.style.top  = (e.clientY - 8) + 'px';
  });
})();

/* ─────────────────────────────────────────────────────────
   5. REAL ML API FETCH (predictor.html)
───────────────────────────────────────────────────────── */
async function fetchHeartRiskPrediction(payload) {
  // Talk to the FastAPI server running on your machine
  const response = await fetch('http://127.0.0.1:8000/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  
  // Return the real risk_percentage and label from Python!
  return await response.json();
}

/* ─────────────────────────────────────────────────────────
   6. HEART RISK FORM SUBMISSION (predictor.html)
───────────────────────────────────────────────────────── */
(function initFormSubmit() {
  const form      = $('#heartRiskForm');
  if (!form) return;

  const submitBtn = $('#submitBtn');
  const btnText   = submitBtn.querySelector('.btn-text');
  const btnLoad   = $('#btnLoading');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!window._validateAll(form)) {
      const firstError = form.querySelector('.has-error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const data = new FormData(form);
    const payload = {
      age:      parseFloat(data.get('age')),
      sex:      parseInt(data.get('sex')),
      cp:       parseInt(data.get('cp')),
      trestbps: parseFloat(data.get('trestbps')),
      chol:     parseFloat(data.get('chol')),
      fbs:      parseInt(data.get('fbs')),
      restecg:  parseInt(data.get('restecg')),
      thalach:  parseFloat(data.get('thalach')),
      exang:    parseInt(data.get('exang')),
      oldpeak:  parseFloat(data.get('oldpeak')),
      slope:    parseInt(data.get('slope')),
      ca:       parseInt(data.get('ca')),
      thal:     parseInt(data.get('thal')),
    };

    setLoadingState(true);

    try {
      const result = await fetchHeartRiskPrediction(payload);
      displayResult(result, payload);
    } catch (err) {
      console.error('Prediction error:', err);
      alert('⚠️ Cannot connect to backend server. Ensure uvicorn api:app --reload is running.');
    } finally {
      setLoadingState(false);
    }
  });

  function setLoadingState(loading) {
    submitBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline-flex';
    btnLoad.style.display = loading ? 'inline-flex' : 'none';
  }
})();

/* ─────────────────────────────────────────────────────────
   7. RESULT MODAL (predictor.html)
───────────────────────────────────────────────────────── */
function displayResult(result, payload) {
  const { risk_percentage, label } = result;
  const isHigh = label === 'High Risk';

  const modal       = $('#resultModal');
  const modalCard   = $('#modalCard');
  const modalHeader = $('#modalHeader');
  const modalIcon   = $('#modalIcon');
  const modalTitle  = $('#modalTitle');
  const modalSub    = $('#modalSubtitle');
  const riskPct     = $('#riskPercentage');
  const riskLabel   = $('#riskLabel');
  const riskDesc    = $('#riskDescription');
  const riskFactors = $('#riskFactors');
  const gaugeFill   = $('#gaugeFill');

  if (!modal) return;

  modalHeader.className = 'modal-header ' + (isHigh ? 'high-risk' : 'low-risk');
  modalIcon.textContent  = isHigh ? '⚠️' : '✅';
  modalTitle.textContent = 'Assessment Complete';
  modalSub.textContent   = 'Based on your 13 clinical indicators';

  riskPct.textContent = risk_percentage + '%';

  riskLabel.className   = 'risk-label ' + (isHigh ? 'high' : 'low');
  riskLabel.textContent = label;

  if (isHigh) {
    riskDesc.textContent =
      'Your clinical indicators suggest an elevated risk of heart disease. ' +
      'We strongly recommend scheduling an appointment with one of our cardiologists ' +
      'for a comprehensive evaluation and personalised care plan.';
  } else {
    riskDesc.textContent =
      'Your clinical indicators suggest a lower probability of heart disease at this time. ' +
      'Continue maintaining a heart-healthy lifestyle and schedule regular check-ups ' +
      'with your physician.';
  }

  const CIRCUMFERENCE = 251.3;
  const offset = CIRCUMFERENCE - (risk_percentage / 100) * CIRCUMFERENCE;

gaugeFill.setAttribute('class', 'gauge-fill ' + (isHigh ? 'high' : 'low'));

  gaugeFill.style.strokeDashoffset = CIRCUMFERENCE;
  setTimeout(() => { gaugeFill.style.strokeDashoffset = offset; }, 100);

  const factors = buildFactorChips(payload, isHigh);
  riskFactors.innerHTML = factors.map(f => `<span class="risk-factor-chip">${f}</span>`).join('');

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  modalCard.scrollTop = 0;
}

function buildFactorChips(p, isHigh) {
  const chips = [];
  if (p.age >= 55)              chips.push(`Age: ${p.age} yrs`);
  if (p.sex === 1)              chips.push('Male');
  if (p.cp === 2 || p.cp === 3) chips.push('Chest Pain: Type ' + p.cp);
  if (p.trestbps > 140)        chips.push(`BP: ${p.trestbps} mmHg`);
  if (p.chol > 240)            chips.push(`Cholesterol: ${p.chol}`);
  if (p.fbs === 1)             chips.push('High Fasting Sugar');
  if (p.exang === 1)           chips.push('Exercise Angina');
  if (p.oldpeak > 1.5)         chips.push(`ST Depression: ${p.oldpeak}`);
  if (p.ca > 1)                chips.push(`${p.ca} Major Vessels`);
  if (p.thal === 3)            chips.push('Reversible Thal Defect');
  if (p.thalach > 150)         chips.push(`Max HR: ${p.thalach} bpm ✓`);
  if (p.trestbps <= 120)       chips.push('Normal BP ✓');
  if (p.chol <= 200)           chips.push('Healthy Cholesterol ✓');
  return chips.slice(0, 6);
}

/* — Close result modal — */
(function initResultModal() {
  const modal    = $('#resultModal');
  const closeBtn = $('#modalClose');
  if (!modal || !closeBtn) return;

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });
})();

/* ─────────────────────────────────────────────────────────
   8. APPOINTMENT FORM SUBMISSION (appointment.html)
───────────────────────────────────────────────────────── */
(function initAppointmentForm() {
  const form      = $('#appointmentForm');
  if (!form) return;

  const submitBtn  = $('#apptSubmitBtn');
  const btnText    = submitBtn.querySelector('.btn-text');
  const btnLoad    = $('#apptBtnLoading');
  const modal      = $('#apptModal');
  const detailsEl  = $('#apptConfirmDetails');

  const doctorNames = {
    'dr-priya-mehra':  'Dr. Priya Mehra (Interventional Cardiologist)',
    'dr-arjun-sharma': 'Dr. Arjun Sharma (Cardiac Electrophysiologist)',
    'dr-kavya-nair':   'Dr. Kavya Nair (Preventive Cardiologist)',
  };

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!window._validateAll(form)) {
      const firstError = form.querySelector('.has-error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // CRITICAL FIX: Extract data before sending it
    const data = new FormData(form);
    const doctorNameStr = doctorNames[data.get('doctor')] || data.get('doctor');

    setApptLoadingState(true);

    try {
      // Send data to Python Backend
      const response = await fetch('http://127.0.0.1:8000/api/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: data.get('fullname'),
          email: data.get('email'),
          phone: data.get('phone'),
          appointment_date: data.get('appt-date'),
          doctor: doctorNameStr
        })
      });

      const result = await response.json();

      if (result.status !== "success") {
        throw new Error(result.message);
      }

      // Build confirmation UI
      let dateDisplay = data.get('appt-date');
      try {
        dateDisplay = new Date(dateDisplay + 'T00:00:00').toLocaleDateString('en-IN', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      } catch(_) { /* keep raw */ }

      if (detailsEl) {
        detailsEl.innerHTML = `
          <div style="display:grid;gap:8px;">
            <div><strong>Patient:</strong> ${data.get('fullname')}</div>
            <div><strong>Email:</strong> ${data.get('email')}</div>
            <div><strong>Phone:</strong> ${data.get('phone')}</div>
            <div><strong>Date:</strong> ${dateDisplay}</div>
            <div><strong>Doctor:</strong> ${doctorNameStr}</div>
          </div>
        `;
      }

      // Show modal
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }

      form.reset();
      $$('.form-group', form).forEach(g => g.classList.remove('is-valid', 'has-error'));

    } catch (err) {
      console.error(err);
      alert("Server Error: Could not book appointment. Ensure uvicorn api:app --reload is running.");
    } finally {
      setApptLoadingState(false);
    }
  });

  function setApptLoadingState(loading) {
    submitBtn.disabled = loading;
    if (btnText) btnText.style.display = loading ? 'none' : 'inline-flex';
    if (btnLoad) btnLoad.style.display = loading ? 'inline-flex' : 'none';
  }

  const apptCloseBtn = $('#apptModalClose');
  if (apptCloseBtn && modal) {
    function closeApptModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    apptCloseBtn.addEventListener('click', closeApptModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeApptModal(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('active')) closeApptModal();
    });
  }
})();

/* ─────────────────────────────────────────────────────────
   9. SMOOTH SCROLL for anchor links (Safari fallback)
───────────────────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ─────────────────────────────────────────────────────────
   10. SCROLL-IN ANIMATIONS (IntersectionObserver)
───────────────────────────────────────────────────────── */
(function initScrollAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    .fade-up {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity .55s ease, transform .55s ease;
    }
    .fade-up.in-view {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  const targets = [
    ...document.querySelectorAll('.doctor-card'),
    ...document.querySelectorAll('.feature-item'),
    ...document.querySelectorAll('.form-card'),
    ...document.querySelectorAll('.section-header'),
    ...document.querySelectorAll('.appt-info-strip'),
  ];

  targets.forEach((el, i) => {
    el.classList.add('fade-up');
    el.style.transitionDelay = (i % 4) * 80 + 'ms';
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => observer.observe(el));
})();