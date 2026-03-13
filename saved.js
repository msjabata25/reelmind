import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const API_BASE = 'https://reel-mind-production.up.railway.app';

const SUPABASE_URL = 'https://opmpbrpfmuowxlihasch.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbXBicnBmbXVvd3hsaWhhc2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDIzNzQsImV4cCI6MjA4ODU3ODM3NH0.SGmNDi2OSfUtp-fPUmsO7_9zp8YD5ex07siXgBUiOm8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Auth guard ───────────────────────────────────────────────────────────────
const { data: { session } } = await supabase.auth.getSession();
if (!session) window.location.replace('auth.html');

// ─── State ────────────────────────────────────────────────────────────────────
let allReels = [];

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

  return `
    <div class="reel-card" id="card-${reel.id}" style="animation-delay: ${index * 0.07}s">
      <div class="card-header">
        <div class="platform-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
          </svg>
          Instagram
        </div>
        <span class="card-date">${formatDate(reel.created_at)}</span>
      </div>

      ${reel.summary ? `<p class="card-summary" onclick="this.classList.toggle('expanded')">${reel.summary}</p>` : ''}

      ${categories.length ? `
      <div class="card-tags-section">
        <span class="section-label">Categories</span>
        <div class="tags-row">
          ${categories.map(c => `<span class="tag tag-category">${c}</span>`).join('')}
        </div>
      </div>` : ''}

      ${tags.length ? `
      <div class="card-tags-section">
        <span class="section-label">Tags</span>
        <div class="tags-row">
          ${tags.map(t => `<span class="tag tag-keyword">#${t}</span>`).join('')}
        </div>
      </div>` : ''}

      <div class="card-footer">
        <a href="${reel.url}" target="_blank" rel="noopener noreferrer" class="view-btn">
          VIEW ON INSTAGRAM
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

// ─── Search / filter ──────────────────────────────────────────────────────────
function filterReels(query) {
  if (!query.trim()) return allReels;
  const q = query.toLowerCase();
  return allReels.filter(reel => {
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