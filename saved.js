import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

import { CONFIG } from './config.js';
const API_BASE = CONFIG.API_BASE;
const SUPABASE_URL = CONFIG.SUPABASE_URL;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Auth guard ───────────────────────────────────────────────────────────────
const { data: { session } } = await supabase.auth.getSession();
if (!session) window.location.replace('auth.html');

// ─── State ────────────────────────────────────────────────────────────────────
let allReels = [];
let allCategories = [];
let activeCategory = 'All';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
}

// ─── Platform helper ─────────────────────────────────────────────────────────
function getPlatform(url) {
  if (url.includes('tiktok.com')) return { name: 'TikTok', label: 'VIEW ON TIKTOK' };
  if (url.includes('youtube.com') || url.includes('youtu.be')) return { name: 'YouTube', label: 'VIEW ON YOUTUBE' };
  return { name: 'Instagram', label: 'VIEW ON INSTAGRAM' };
}

// ─── Render helpers ───────────────────────────────────────────────────────────
function renderSkeletons() {
  return `
    <div class="loading-grid">
      ${[1,2,3].map(() => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-block"></div>
        <div class="skeleton skeleton-tags"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>`).join('')}
    </div>`;
}

function renderEmpty() {
  return `
    <div class="reels-grid">
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
        </div>
        <h2>No reels saved yet</h2>
        <p>Head back to ReelMind and categorize your first reel.</p>
        <a href="index.html" class="empty-cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Categorize a Reel
        </a>
      </div>
    </div>`;
}

function renderNoResults(query) {
  return `
    <div class="reels-grid">
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <h2>No results found</h2>
        <p>Nothing matched "<strong>${query}</strong>". Try a different keyword.</p>
      </div>
    </div>`;
}

function renderError(msg) {
  return `
    <div class="reels-grid">
      <div class="error-state">
        <p>⚠️ ${msg}</p>
        <button class="retry-btn" onclick="loadReels()">Try again</button>
      </div>
    </div>`;
}

function renderCard(reel, index) {
  const categories = Array.isArray(reel.categories) ? reel.categories : [];
  const tags       = Array.isArray(reel.tags)       ? reel.tags       : [];
  const platform   = getPlatform(reel.url);

  return `
    <div class="reel-card" id="card-${reel.id}" style="animation-delay: ${index * 0.07}s">
      <div class="card-header">
        <div class="platform-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
          </svg>
          ${platform.name}
        </div>
        <span class="card-date">${formatDate(reel.created_at)}</span>
      </div>

      ${reel.summary ? `<p class="card-summary" onclick="this.classList.toggle('expanded')">${reel.summary}</p>` : ''}

      ${categories.length ? `
      <div class="card-tags-section">
        <div class="section-label-row">
          <span class="section-label">Categories</span>
          <button class="edit-cat-btn" onclick="openCatEditor(${reel.id})" title="Edit categories">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
        <div class="tags-row" id="cat-tags-${reel.id}">
          ${categories.map(c => `<span class="tag tag-category">${c}</span>`).join('')}
        </div>
      </div>` : `
      <div class="card-tags-section">
        <div class="section-label-row">
          <span class="section-label">Categories</span>
          <button class="edit-cat-btn" onclick="openCatEditor(${reel.id})" title="Edit categories">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
        <div class="tags-row" id="cat-tags-${reel.id}"></div>
      </div>`}

      ${tags.length ? `
      <div class="card-tags-section">
        <span class="section-label">Tags</span>
        <div class="tags-row">
          ${tags.map(t => `<span class="tag tag-keyword">#${t}</span>`).join('')}
        </div>
      </div>` : ''}

      <div class="card-footer">
        <a href="${reel.url}" target="_blank" rel="noopener noreferrer" class="view-btn">
          ${platform.label}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
        <button class="delete-btn" onclick="deleteReel(${reel.id})" title="Delete reel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>`;
}

// ─── Categories ───────────────────────────────────────────────────────────────
async function loadCategories() {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/categories`, { headers });
    if (!res.ok) throw new Error();
    allCategories = (await res.json()).map(c => c.name);
    renderCategoryPills();
  } catch (err) {
    console.error('Could not load categories:', err);
  }
}

function renderCategoryPills() {
  const row      = document.getElementById('categoryRow');
  const container = document.getElementById('categoryPills');
  if (!container) return;

  const pills = ['All', ...allCategories];

  container.innerHTML = pills.map(cat => `
    <button class="cat-pill ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join('') + `
    <button class="cat-pill cat-add" id="catAddBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
    <div class="cat-input-wrap" id="catInputWrap" style="display:none;">
      <input class="cat-input" id="catInput" type="text" placeholder="New category..." maxlength="32" />
      <button class="cat-confirm" id="catConfirm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
      <button class="cat-cancel" id="catCancel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;

  if (row) row.style.display = 'flex';

  // Pill click
  container.querySelectorAll('.cat-pill[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCategoryPills();
      const query = document.getElementById('searchInput')?.value || '';
      renderGrid(filterReels(query), query);
    });
  });

  // "+" button
  document.getElementById('catAddBtn')?.addEventListener('click', () => {
    document.getElementById('catAddBtn').style.display = 'none';
    const wrap = document.getElementById('catInputWrap');
    wrap.style.display = 'flex';
    document.getElementById('catInput').focus();
  });

  // Cancel
  document.getElementById('catCancel')?.addEventListener('click', closeCatInput);

  // Confirm
  document.getElementById('catConfirm')?.addEventListener('click', submitNewCategory);

  // Enter key
  document.getElementById('catInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitNewCategory();
    if (e.key === 'Escape') closeCatInput();
  });
}

function closeCatInput() {
  document.getElementById('catInputWrap').style.display = 'none';
  document.getElementById('catAddBtn').style.display = 'flex';
  document.getElementById('catInput').value = '';
}

async function submitNewCategory() {
  const input = document.getElementById('catInput');
  const name  = input.value.trim();
  if (!name) return;

  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error();

    if (!allCategories.includes(name)) allCategories.push(name);
    activeCategory = name;
    closeCatInput();
    renderCategoryPills();
    const query = document.getElementById('searchInput')?.value || '';
    renderGrid(filterReels(query), query);
  } catch (err) {
    console.error('Could not add category:', err);
    input.style.borderColor = 'rgba(248,113,113,0.5)';
    setTimeout(() => input.style.borderColor = '', 1000);
  }
}

// ─── Search / filter ──────────────────────────────────────────────────────────
function filterReels(query) {
  let reels = allReels;

  if (activeCategory !== 'All') {
    reels = reels.filter(r => r.categories?.some(c => c === activeCategory));
  }

  if (!query.trim()) return reels;
  const q = query.toLowerCase();
  return reels.filter(reel => {
    const inSummary    = reel.summary?.toLowerCase().includes(q);
    const inCategories = reel.categories?.some(c => c.toLowerCase().includes(q));
    const inTags       = reel.tags?.some(t => t.toLowerCase().includes(q));
    return inSummary || inCategories || inTags;
  });
}

function renderGrid(reels, query = '') {
  const container = document.getElementById('gridContainer');
  const countEl   = document.getElementById('reelCount');
  const resultsEl = document.getElementById('searchResultsCount');

  if (!reels || reels.length === 0) {
    container.innerHTML = query ? renderNoResults(query) : renderEmpty();
    countEl.textContent = '0 reels saved';
    if (resultsEl) resultsEl.textContent = '';
    return;
  }

  container.innerHTML = `<div class="reels-grid">${reels.map((r, i) => renderCard(r, i)).join('')}</div>`;
  countEl.textContent = `${allReels.length} reel${allReels.length !== 1 ? 's' : ''} saved`;
  if (resultsEl) {
    resultsEl.textContent = query ? `${reels.length} result${reels.length !== 1 ? 's' : ''}` : '';
  }
}

// ─── Category editor ──────────────────────────────────────────────────────────
window.openCatEditor = function(reelId) {
  // Close any existing popover
  document.querySelectorAll('.cat-popover').forEach(p => p.remove());

  const reel = allReels.find(r => r.id === reelId);
  if (!reel) return;

  const currentCats = Array.isArray(reel.categories) ? reel.categories : [];
  const card = document.getElementById(`card-${reelId}`);
  if (!card) return;

  const popover = document.createElement('div');
  popover.className = 'cat-popover';
  popover.innerHTML = `
    <div class="cat-popover-title">Edit Categories</div>
    <div class="cat-popover-list">
      <label class="cat-popover-item cat-popover-ai" id="catAiItem">
        <span class="cat-ai-icon">✨</span>
        <span>Let AI decide</span>
      </label>
      ${allCategories.length ? `<div class="cat-popover-divider"></div>` + allCategories.map(cat => `
        <label class="cat-popover-item">
          <input type="checkbox" value="${cat}" ${currentCats.includes(cat) ? 'checked' : ''} />
          <span>${cat}</span>
        </label>
      `).join('') : '<p class="cat-popover-empty">No categories yet. Add one above.</p>'}
    </div>
    <div class="cat-popover-footer">
      <button class="cat-popover-cancel" onclick="this.closest('.cat-popover').remove()">Cancel</button>
      <button class="cat-popover-save" onclick="saveCatEdit(${reelId}, this)">Save</button>
    </div>
  `;

  card.style.position = 'relative';
  card.appendChild(popover);

  // Let AI decide click
  popover.querySelector('#catAiItem')?.addEventListener('click', () => aiDecideCategoryFromPopover(reelId, popover));

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler(e) {
      if (!popover.contains(e.target)) {
        aiItem.classList.remove('thinking');
        popover.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 0);
}

window.saveCatEdit = async function(reelId, btn) {
  const popover = btn.closest('.cat-popover');
  const checked = [...popover.querySelectorAll('input[type=checkbox]:checked')].map(i => i.value);

  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/reels/${reelId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ categories: checked })
    });
    if (!res.ok) throw new Error();

    // Update local state
    const reel = allReels.find(r => r.id === reelId);
    if (reel) reel.categories = checked;

    // Update tags row in DOM
    const tagsRow = document.getElementById(`cat-tags-${reelId}`);
    if (tagsRow) {
      tagsRow.innerHTML = checked.map(c => `<span class="tag tag-category">${c}</span>`).join('');
    }

    // Refresh category pills in case new ones were added
    await loadCategories();

    popover.remove();
  } catch (err) {
    console.error('Failed to update categories:', err);
    btn.textContent = 'Save';
    btn.disabled = false;
    btn.style.background = 'rgba(248,113,113,0.2)';
  }
}

async function aiDecideCategoryFromPopover(reelId, popover) {
  const aiItem = popover.querySelector('#catAiItem');
  const saveBtn = popover.querySelector('.cat-popover-save');
  const cancelBtn = popover.querySelector('.cat-popover-cancel');

  aiItem.innerHTML = `<span class="cat-ai-icon">✨</span><span>Thinking…</span>`;
  aiItem.classList.add('thinking');
  saveBtn.disabled = true;
  cancelBtn.disabled = true;

  try {
    const apiKey = localStorage.getItem('gemini_api_key');
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/categorize-ai`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reel_id: reelId, api_key: apiKey })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();

    // Update local state
    const reel = allReels.find(r => r.id === reelId);
    if (reel) reel.categories = data.categories;

    // Update tags row in DOM
    const tagsRow = document.getElementById(`cat-tags-${reelId}`);
    if (tagsRow) {
      tagsRow.innerHTML = data.categories.map(c => `<span class="tag tag-category">${c}</span>`).join('');
    }

    // Add new category to pill list if needed
    if (!allCategories.includes(data.category)) {
      allCategories.push(data.category);
      renderCategoryPills();
    }

    popover.remove();
  } catch (err) {
    console.error('AI categorization failed:', err);
    aiItem.innerHTML = `<span class="cat-ai-icon">✨</span><span>Let AI decide</span>`;
    aiItem.style.pointerEvents = '';
    saveBtn.disabled = false;
    cancelBtn.disabled = false;
    aiItem.classList.remove('thinking');
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
window.deleteReel = async function(id) {
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    card.style.opacity    = '0';
    card.style.transform  = 'scale(0.96)';
  }

  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/reels/${id}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    allReels = allReels.filter(r => r.id !== id);
    if (card) card.remove();

    const query = document.getElementById('searchInput')?.value || '';
    if (allReels.length === 0) renderGrid([], query);

    const countEl = document.getElementById('reelCount');
    countEl.textContent = `${allReels.length} reel${allReels.length !== 1 ? 's' : ''} saved`;

  } catch (err) {
    console.error('Delete failed:', err);
    if (card) {
      card.style.opacity   = '1';
      card.style.transform = 'scale(1)';
    }
    alert('Could not delete this reel. Is the server running?');
  }
}

// ─── Load ─────────────────────────────────────────────────────────────────────
async function loadReels() {
  const container = document.getElementById('gridContainer');
  const countEl   = document.getElementById('reelCount');
  const searchBar = document.getElementById('searchBar');

  container.innerHTML = renderSkeletons();
  countEl.textContent = 'Loading...';
  if (searchBar) searchBar.style.display = 'none';

  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/reels`, { headers });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    allReels = await res.json();

    if (allReels.length > 0 && searchBar) searchBar.style.display = 'flex';
    renderGrid(allReels);

  } catch (err) {
    container.innerHTML = renderError('Could not load your reels. Is the server running?');
    countEl.textContent = '';
    console.error(err);
  }
}

// ─── Search wiring ────────────────────────────────────────────────────────────
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const query    = e.target.value;
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
  renderGrid(filterReels(query), query);
});

document.getElementById('searchClear')?.addEventListener('click', () => {
  const input = document.getElementById('searchInput');
  input.value = '';
  document.getElementById('searchClear').style.display = 'none';
  const resultsEl = document.getElementById('searchResultsCount');
  if (resultsEl) resultsEl.textContent = '';
  renderGrid(allReels);
  input.focus();
});

loadReels();
loadCategories();