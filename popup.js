// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
const DEFAULT_STATE = {
  theme: 'dark',
  platform: 'openshift',
  weblogicEnvs: [
    { id: 'wl_1', label: 'Test', machine: 'kurumsaltest13' },
    { id: 'wl_2', label: 'Preprod', machine: 'preprod11' }
  ]
};

let state = { ...DEFAULT_STATE };

// ═══════════════════════════════════════════
//  STORAGE (Edge + Chrome + fallback)
// ═══════════════════════════════════════════
function getStorageAPI() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) return chrome.storage.sync;
  } catch (e) {}
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) return chrome.storage.local;
  } catch (e) {}
  try {
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) return browser.storage.sync;
  } catch (e) {}
  try {
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) return browser.storage.local;
  } catch (e) {}
  return null;
}

const storageAPI = getStorageAPI();

async function loadState() {
  if (storageAPI) {
    return new Promise(resolve => {
      try {
        storageAPI.get('bbTagState', (data) => {
          if (data && data.bbTagState) {
            state = { ...DEFAULT_STATE, ...data.bbTagState };
          }
          resolve();
        });
      } catch (e) {
        loadFromLocalStorage();
        resolve();
      }
    });
  } else {
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('bbTagState');
    if (raw) state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
}

async function saveState() {
  if (storageAPI) {
    return new Promise(resolve => {
      try {
        storageAPI.set({ bbTagState: state }, () => resolve());
      } catch (e) {
        saveToLocalStorage();
        resolve();
      }
    });
  } else {
    saveToLocalStorage();
  }
}

function saveToLocalStorage() {
  try { localStorage.setItem('bbTagState', JSON.stringify(state)); } catch (e) {}
}

// ═══════════════════════════════════════════
//  BROWSER API (Edge + Chrome)
// ═══════════════════════════════════════════
function getBrowserAPI() {
  try { if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) return chrome; } catch (e) {}
  try { if (typeof browser !== 'undefined' && browser.tabs && browser.scripting) return browser; } catch (e) {}
  return null;
}

const browserAPI = getBrowserAPI();

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  applyTheme();
  applyPlatform();
  renderWLButtons();
  renderWLSettings();
  setupListeners();
});

// ═══════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════
function applyTheme() {
  document.body.dataset.theme = state.theme;
  const icon = state.theme === 'dark' ? '☀️' : '🌙';
  document.getElementById('themeToggle').textContent = icon;
  document.getElementById('themeToggle2').textContent = icon;
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
}

// ═══════════════════════════════════════════
//  PLATFORM TOGGLE
// ═══════════════════════════════════════════
function applyPlatform() {
  const isOS = state.platform === 'openshift';
  document.getElementById('togOS').classList.toggle('active', isOS);
  document.getElementById('togWL').classList.toggle('active', !isOS);
  document.getElementById('panelOS').classList.toggle('active', isOS);
  document.getElementById('panelWL').classList.toggle('active', !isOS);
}

function setPlatform(p) {
  state.platform = p;
  applyPlatform();
  saveState();
}

// ═══════════════════════════════════════════
//  WEBLOGIC — RENDER BUTTONS
// ═══════════════════════════════════════════
function renderWLButtons() {
  const container = document.getElementById('wlButtons');

  if (state.weblogicEnvs.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <span>📦</span>
        No environments configured.<br>Add them in Settings.
      </div>`;
    return;
  }

  container.innerHTML = state.weblogicEnvs.map((env) => {
    const tagPattern = `deployto-{ts}_weblogic-${env.machine}`;
    return `
      <button class="tag-btn wl-env" data-tag="${escapeAttr(tagPattern)}">
        <div class="dot"></div>
        <div class="info">
          <div class="label">${escapeHtml(env.label)}</div>
          <div class="pattern">deployto-{ts}_weblogic-${escapeHtml(env.machine)}</div>
        </div>
        <div class="arrow">→</div>
      </button>`;
  }).join('');

  container.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => handleTagClick(btn));
  });
}

// ═══════════════════════════════════════════
//  WEBLOGIC — SETTINGS RENDER
// ═══════════════════════════════════════════
function renderWLSettings() {
  const list = document.getElementById('wlEnvList');

  list.innerHTML = state.weblogicEnvs.map((env, i) => `
    <div class="env-card" data-idx="${i}">
      <div class="env-card-header">
        <span class="env-card-title">#${i + 1}</span>
        <button class="env-remove" data-idx="${i}" title="Remove">✕</button>
      </div>
      <div class="field-row">
        <div style="flex:1">
          <div class="field-label">Label</div>
          <input type="text" class="env-label" value="${escapeAttr(env.label)}" placeholder="e.g. Test">
        </div>
        <div style="flex:1">
          <div class="field-label">Machine</div>
          <input type="text" class="env-machine" value="${escapeAttr(env.machine)}" placeholder="e.g. kurumsaltest13">
        </div>
      </div>
      <div class="field-row">
        <div style="flex:1">
          <div class="field-label">Preview</div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--text2); padding:5px 0;">
            deployto-{ts}_weblogic-${escapeHtml(env.machine)}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.env-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      state.weblogicEnvs.splice(idx, 1);
      renderWLSettings();
    });
  });
}

function addEnvironment() {
  const id = 'wl_' + Date.now();
  state.weblogicEnvs.push({ id, label: '', machine: '' });
  renderWLSettings();

  const cards = document.querySelectorAll('.env-card');
  const last = cards[cards.length - 1];
  if (last) last.querySelector('.env-label').focus();
}

function collectEnvSettings() {
  const cards = document.querySelectorAll('.env-card');
  state.weblogicEnvs = Array.from(cards).map((card, i) => ({
    id: state.weblogicEnvs[i]?.id || 'wl_' + Date.now() + i,
    label: card.querySelector('.env-label').value.trim(),
    machine: card.querySelector('.env-machine').value.trim()
  })).filter(e => e.machine);
}

// ═══════════════════════════════════════════
//  TAG CREATION (DOM injection into Bitbucket)
// ═══════════════════════════════════════════
function generateTagName(template) {
  const ts = Date.now();
  return template.replace('{ts}', ts);
}

async function handleTagClick(btn) {
  const template = btn.dataset.tag;
  const tagName = generateTagName(template);

  btn.querySelector('.arrow').textContent = '⏳';
  document.getElementById('lastTag').textContent = tagName;
  document.getElementById('statusText').textContent = 'Creating...';

  if (!browserAPI) {
    showResult(btn, false, 'Browser API not available');
    return;
  }

  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];

    if (!tab?.url || !tab.url.toLowerCase().includes('bitbucket')) {
      showResult(btn, false, 'Not on a Bitbucket page');
      return;
    }

    const results = await browserAPI.scripting.executeScript({
      target: { tabId: tab.id },
      func: createTagOnPage,
      args: [tagName]
    });

    const result = results?.[0]?.result;
    if (result?.success) {
      showResult(btn, true, 'Tag created');
    } else {
      showResult(btn, false, result?.error || 'Unknown error');
    }
  } catch (err) {
    showResult(btn, false, err.message);
  }
}

function showResult(btn, success, msg) {
  btn.classList.add(success ? 'success' : 'error');
  btn.querySelector('.arrow').textContent = success ? '✓' : '✕';
  document.getElementById('statusText').textContent = msg;

  setTimeout(() => {
    btn.classList.remove('success', 'error');
    btn.querySelector('.arrow').textContent = '→';
    document.getElementById('statusText').textContent = 'Ready';
  }, 3000);
}

// Runs inside the Bitbucket page
function createTagOnPage(tagName) {
  return new Promise(resolve => {
    try {
      const addBtn = document.querySelector('button[data-testid="add-tag-btn"]');
      if (!addBtn) { resolve({ success: false, error: 'Add tag button not found' }); return; }

      addBtn.click();

      setTimeout(() => {
        const input = document.querySelector('input[data-testid="tag-name-field"]');
        if (!input) { resolve({ success: false, error: 'Tag input not found' }); return; }

        input.focus();
        input.click();

        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        setter.call(input, tagName);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();

        setTimeout(() => {
          const createBtn = document.querySelector('button[data-testid="create-tag-button"]');
          if (!createBtn) { resolve({ success: false, error: 'Create button not found' }); return; }
          createBtn.click();
          resolve({ success: true });
        }, 500);
      }, 500);
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

// ═══════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════
function showSettings() {
  document.getElementById('mainView').classList.remove('active');
  document.getElementById('settingsView').classList.add('active');
  renderWLSettings();
}

function showMain() {
  document.getElementById('settingsView').classList.remove('active');
  document.getElementById('mainView').classList.add('active');
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════
function setupListeners() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('themeToggle2').addEventListener('click', toggleTheme);

  document.getElementById('togOS').addEventListener('click', () => setPlatform('openshift'));
  document.getElementById('togWL').addEventListener('click', () => setPlatform('weblogic'));

  document.getElementById('openSettings').addEventListener('click', showSettings);
  document.getElementById('backBtn').addEventListener('click', showMain);

  document.querySelectorAll('#panelOS .tag-btn').forEach(btn => {
    btn.addEventListener('click', () => handleTagClick(btn));
  });

  document.getElementById('btn-run').addEventListener('click', function() {
    handleTagClick(this);
  });

  document.getElementById('addEnvBtn').addEventListener('click', addEnvironment);

  document.getElementById('saveBtn').addEventListener('click', async () => {
    collectEnvSettings();
    await saveState();
    renderWLButtons();

    const msg = document.getElementById('saveMsg');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
  });
}
