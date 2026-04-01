import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
import { CONFIG } from './config.js';
const API_BASE = CONFIG.API_BASE;
const SUPABASE_URL = CONFIG.SUPABASE_URL;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ─────────────────────────────────────────────────────────────────────────────

// ─── Auth guard ───────────────────────────────────────────────────────────────
const { data: { session } } = await supabase.auth.getSession();
if (!session) window.location.replace('auth.html');
if (!localStorage.getItem('gemini_api_key')) window.location.replace('setup.html');

// ─── State ────────────────────────────────────────────────────────────────────
let userCategories = [];
let lastReelId = null;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
}

async function loadUserCategories() {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/categories`, { headers });
    if (res.ok) userCategories = (await res.json()).map(c => c.name);
  } catch (err) {
    console.error('Could not load categories:', err);
  }
}

loadUserCategories();

// ─── Elements ────────────────────────────────────────────────────────────────
const input         = document.getElementById('reelUrl');
const submitBtn     = document.getElementById('submitBtn');
const pasteBtn      = document.getElementById('pasteBtn');
const statusEl      = document.getElementById('status');
const resultBox     = document.getElementById('resultBox');
const resultContent = document.getElementById('resultContent');

// ─── Settings modal ───────────────────────────────────────────────────────────
const gearBtn        = document.getElementById('gearBtn');
const settingsModal  = document.getElementById('settingsModal');
const modalOverlay   = document.getElementById('modalOverlay');
const closeModal     = document.getElementById('closeModal');
const modalKeyInput  = document.getElementById('modalKeyInput');
const modalSaveBtn   = document.getElementById('modalSaveBtn');
const modalStatus    = document.getElementById('modalStatus');
const clearKeyBtn    = document.getElementById('clearKeyBtn');
const toggleModalKey = document.getElementById('toggleModalKey');
const signOutBtn     = document.getElementById('signOutBtn');

function openSettings() {
  const saved = localStorage.getItem('gemini_api_key') || '';
  modalKeyInput.value = saved;
  modalKeyInput.type  = 'password';
  modalStatus.textContent = '';
  modalStatus.className   = 'modal-status';
  settingsModal.classList.add('visible');
  modalOverlay.classList.add('visible');
}

function closeSettings() {
  settingsModal.classList.remove('visible');
  modalOverlay.classList.remove('visible');
}

gearBtn.addEventListener('click', openSettings);
closeModal.addEventListener('click', closeSettings);
modalOverlay.addEventListener('click', closeSettings);

toggleModalKey.addEventListener('click', () => {
  const isPassword = modalKeyInput.type === 'password';
  modalKeyInput.type = isPassword ? 'text' : 'password';
  toggleModalKey.innerHTML = isPassword
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

modalSaveBtn.addEventListener('click', async () => {
  const key = modalKeyInput.value.trim();
  if (!key) return;

  modalSaveBtn.disabled   = true;
  modalStatus.textContent = 'Verifying…';
  modalStatus.className   = 'modal-status loading';

  try {
    const res  = await fetch(`${API_BASE}/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key }),
    });
    const data = await res.json();
    if (!res.ok || !data.valid) throw new Error(data.detail || 'Invalid API key');
    localStorage.setItem('gemini_api_key', key);
    modalStatus.textContent = 'Key saved!';
    modalStatus.className   = 'modal-status success';
    setTimeout(closeSettings, 900);
  } catch (err) {
    modalStatus.textContent = err.message;
    modalStatus.className   = 'modal-status error';
  } finally {
    modalSaveBtn.disabled = false;
  }
});

clearKeyBtn.addEventListener('click', () => {
  localStorage.removeItem('gemini_api_key');
  window.location.replace('setup.html');
});

signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('gemini_api_key');
  window.location.replace('auth.html');
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SOCIAL_VIDEO_PATTERN = /(instagram\.com\/(reel|reels|p)\/|youtube\.com\/shorts\/|tiktok\.com\/(@[\w.-]+\/video\/\d+|t\/\w+))/;

function validate(url) {
  if (!url) return null;
  
  try { 
    // Basic URL structure check
    new URL(url); 
  } catch { 
    return false; 
  }

  return SOCIAL_VIDEO_PATTERN.test(url);
}

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className   = `status ${type}`;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle('loading', isLoading);
  submitBtn.querySelector('.btn-text').textContent = isLoading ? 'ANALYZING…' : 'ANALYZE REEL';
}

// ─── API ─────────────────────────────────────────────────────────────────────
async function categorizeReel(url) {
  const apiKey = localStorage.getItem('gemini_api_key');
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(API_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ url, api_key: apiKey }),
  });

  if (!res.ok) {
    const err = await res.json()
    console.log('Full error: ', err)
    throw new Error(JSON.stringify(err));
  }

  return res.json();
}

function renderResult(data) {
  if (!data.summary && !data.tags) {
    resultContent.innerHTML = `<pre style="font-size:0.8rem;opacity:0.7;white-space:pre-wrap">${JSON.stringify(data, null, 2)}</pre>`;
    return;
  }

  let html = '';
  if (data.summary) {
    html += `<p class="result-summary" onclick="this.classList.toggle('expanded')">${data.summary}</p>`;
  }
  if (data.tags?.length) {
    html += `<div class="result-section-label">Tags</div>`;
    html += data.tags.map(t => `<span class="tag tag-keyword">#${t}</span>`).join('');
  }

  // Categorize section
  html += `<div class="result-section-label" style="margin-top:16px;">Categorize</div>`;
  html += `<div class="categorize-row" id="categorizeRow">`;

  if (userCategories.length) {
    html += userCategories.map(cat => `
      <button class="cat-pick-pill" onclick="pickCategory('${cat.replace(/'/g, "\\'")}')">${cat}</button>
    `).join('');
  }

  html += `
    <button class="cat-pick-pill cat-ai-pick" id="aiDecideBtn" onclick="aiDecideCategory()">
      ✨ Let AI decide
    </button>
  </div>
  <div id="categoryResult"></div>`;

  resultContent.innerHTML = html;
}

window.pickCategory = async function(cat) {
  if (!lastReelId) return;
  setCategorizeLoading(true);
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/reels/${lastReelId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ categories: [cat] })
    });
    if (!res.ok) throw new Error();
    showCategoryResult([cat]);
    if (!userCategories.includes(cat)) {
      userCategories.push(cat);
    }
  } catch (err) {
    console.error('Failed to save category:', err);
  } finally {
    setCategorizeLoading(false);
  }
}

window.aiDecideCategory = async function() {
  if (!lastReelId) return;
  setCategorizeLoading(true);
  try {
    const apiKey = localStorage.getItem('gemini_api_key');
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/categorize-ai`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reel_id: lastReelId, api_key: apiKey })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    showCategoryResult(data.categories);
    if (!userCategories.includes(data.category)) {
      userCategories.push(data.category);
    }
  } catch (err) {
    console.error('AI categorization failed:', err);
  } finally {
    setCategorizeLoading(false);
  }
}

function setCategorizeLoading(loading) {
  const row = document.getElementById('categorizeRow');
  if (row) {
    row.querySelectorAll('button').forEach(b => b.disabled = loading);
    const aiBtn = document.getElementById('aiDecideBtn');
    if (aiBtn) aiBtn.textContent = loading ? '✨ Thinking…' : '✨ Let AI decide';
  }
}

function showCategoryResult(categories) {
  const el = document.getElementById('categoryResult');
  if (!el) return;
  el.innerHTML = `
    <div class="result-section-label" style="margin-top:12px;">Saved under</div>
    ${categories.map(c => `<span class="tag tag-category">${c}</span>`).join('')}
  `;
  // Hide the categorize row
  const row = document.getElementById('categorizeRow');
  if (row) row.style.display = 'none';
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
input.addEventListener('input', () => {
  const val = input.value.trim();
  const v   = validate(val);

  if (!val) {
    input.className    = 'url-input';
    submitBtn.disabled = true;
    setStatus('');
  } else if (v === false) {
    input.className    = 'url-input invalid';
    submitBtn.disabled = true;
    setStatus('Not a valid URL', 'error');
  } else {
    input.className    = 'url-input valid';
    submitBtn.disabled = false;
    setStatus('Looks good!', 'success');
  }
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !submitBtn.disabled) {
    e.preventDefault();
    submitBtn.click();
  }
});

pasteBtn.addEventListener('click', async () => {
  try {
    input.value = await navigator.clipboard.readText();
    input.dispatchEvent(new Event('input'));
  } catch {
    setStatus('Clipboard access denied', 'error');
  }
});

submitBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  setLoading(true);
  setStatus('Analyzing with AI…', 'loading');
  resultBox.classList.remove('visible');

  try {
    const data = await categorizeReel(url);
    lastReelId = data.id;
    await loadUserCategories();
    setStatus('Done! Now pick a category.', 'success');
    renderResult(data);
    resultBox.classList.add('visible');
  } catch (err) {
    setStatus(`Error: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
});