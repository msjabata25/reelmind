import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ─── Supabase client ──────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://opmpbrpfmuowxlihasch.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbXBicnBmbXVvd3hsaWhhc2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDIzNzQsImV4cCI6MjA4ODU3ODM3NH0.SGmNDi2OSfUtp-fPUmsO7_9zp8YD5ex07siXgBUiOm8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Redirect if already logged in ───────────────────────────────────────────
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  // Already logged in — check if they have an API key set up
  const hasKey = localStorage.getItem('gemini_api_key');
  window.location.replace(hasKey ? 'index.html' : 'setup.html');
}

// ─── Elements ─────────────────────────────────────────────────────────────────
const signinBtn    = document.getElementById('signinBtn');
const signupBtn    = document.getElementById('signupBtn');
const cardTitle    = document.getElementById('cardTitle');
const cardSubtitle = document.getElementById('cardSubtitle');
const confirmField = document.getElementById('confirmField');
const submitBtn    = document.getElementById('submitBtn');
const statusEl     = document.getElementById('status');
const emailInput   = document.getElementById('emailInput');
const passwordInput  = document.getElementById('passwordInput');
const confirmInput   = document.getElementById('confirmInput');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirm  = document.getElementById('toggleConfirm');

// ─── Mode (signin vs signup) ──────────────────────────────────────────────────
let mode = 'signin'; // 'signin' or 'signup'

function setMode(newMode) {
  mode = newMode;

  const isSignup = mode === 'signup';

  // Toggle button styles
  signinBtn.classList.toggle('active', !isSignup);
  signupBtn.classList.toggle('active', isSignup);

  // Show/hide confirm password field
  confirmField.classList.toggle('visible', isSignup);

  // Update text
  cardTitle.textContent    = isSignup ? 'Create account' : 'Welcome back';
  cardSubtitle.textContent = isSignup
    ? 'Start saving and organizing your reels.'
    : 'Sign in to access your reel library.';
  submitBtn.querySelector('.btn-text').textContent = isSignup ? 'CREATE ACCOUNT' : 'SIGN IN';

  // Clear any previous status
  setStatus('', '');
}

signinBtn.addEventListener('click', () => setMode('signin'));
signupBtn.addEventListener('click', () => setMode('signup'));

// ─── Show/hide password toggles ───────────────────────────────────────────────
function makeToggle(btn, input) {
  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
         </svg>`;
  });
}

makeToggle(togglePassword, passwordInput);
makeToggle(toggleConfirm, confirmInput);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className   = `status ${type}`;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle('loading', isLoading);
}

// ─── Submit ───────────────────────────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  const email    = emailInput.value.trim();
  const password = passwordInput.value;
  const confirm  = confirmInput.value;

  // Basic validation
  if (!email || !password) {
    setStatus('Please fill in all fields.', 'error');
    return;
  }

  if (mode === 'signup' && password !== confirm) {
    setStatus('Passwords do not match.', 'error');
    confirmInput.classList.add('error');
    return;
  }

  confirmInput.classList.remove('error');
  setLoading(true);
  setStatus(mode === 'signup' ? 'Creating your account…' : 'Signing you in…', 'loading');

  if (mode === 'signin') {
    // ── Sign in ──
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message, 'error');
      setLoading(false);
      return;
    }

    // Signed in — go to setup if no API key, otherwise straight to app
    setStatus('Signed in! Redirecting…', 'success');
    const hasKey = localStorage.getItem('gemini_api_key');
    setTimeout(() => window.location.replace(hasKey ? 'index.html' : 'setup.html'), 700);

  } else {
    // ── Sign up ──
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setStatus(error.message, 'error');
      setLoading(false);
      return;
    }

    // Supabase sends a confirmation email by default.
    // If email confirmation is disabled in your Supabase dashboard, 
    // data.session will exist and we can redirect immediately.
    if (data.session) {
      setStatus('Account created! Redirecting…', 'success');
      setTimeout(() => window.location.replace('setup.html'), 700);
    } else {
      // Email confirmation required
      setStatus('Check your email to confirm your account, then sign in.', 'success');
      setLoading(false);
      setMode('signin');
    }
  }
});

// Allow Enter key to submit
[emailInput, passwordInput, confirmInput].forEach(el => {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });
});