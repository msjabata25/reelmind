import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const API_BASE = 'https://reel-mind-production.up.railway.app';

const SUPABASE_URL = 'https://opmpbrpfmuowxlihasch.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbXBicnBmbXVvd3hsaWhhc2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDIzNzQsImV4cCI6MjA4ODU3ODM3NH0.SGmNDi2OSfUtp-fPUmsO7_9zp8YD5ex07siXgBUiOm8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ─── Auth guard ───────────────────────────────────────────────────────────────
const { data: { session } } = await supabase.auth.getSession();
if (!session) window.location.replace('auth.html');

// If already has a key, skip setup
if (localStorage.getItem('gemini_api_key')) {
  window.location.replace('index.html');
}

// ─── Elements ────────────────────────────────────────────────────────────────
const input     = document.getElementById('apiKeyInput');
const saveBtn   = document.getElementById('saveBtn');
const statusEl  = document.getElementById('status');
const toggleBtn = document.getElementById('toggleVisibility');

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className   = `status ${type}`;
}

function setLoading(isLoading) {
  saveBtn.disabled = isLoading;
  saveBtn.classList.toggle('loading', isLoading);
  saveBtn.querySelector('.btn-text').textContent = isLoading ? 'VERIFYING…' : 'SAVE & CONTINUE';
}

input.addEventListener('input', () => {
  const val = input.value.trim();
  saveBtn.disabled = !val;
  if (!val) {
    input.className = 'key-input';
    setStatus('');
  }
});

toggleBtn.addEventListener('click', () => {
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  toggleBtn.innerHTML = isPassword
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

saveBtn.addEventListener('click', async () => {
  const key = input.value.trim();
  if (!key) return;

  setLoading(true);
  setStatus('Verifying your key…', 'loading');
  input.className = 'key-input';

  try {
    const res  = await fetch(`${API_BASE}/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key }),
    });
    const data = await res.json();
    if (!res.ok || !data.valid) throw new Error(data.detail || 'Invalid API key');

    localStorage.setItem('gemini_api_key', key);
    input.className = 'key-input valid';
    setStatus('Key verified! Taking you in…', 'success');
    setTimeout(() => window.location.replace('index.html'), 800);

  } catch (err) {
    input.className = 'key-input error';
    setStatus(err.message, 'error');
    setLoading(false);
  }
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !saveBtn.disabled) saveBtn.click();
});


