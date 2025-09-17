const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const STATUS = document.getElementById('status');
const GRID = document.getElementById('mods-grid');

menuBtn.addEventListener('click', () => {
  const open = sideMenu.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  sideMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
});

const MODLIST_URL = 'https://raw.githubusercontent.com/polytrackmods/PolyLibrary/refs/heads/main/modlist.json';
const CACHE_KEY = 'modsCache';

// Compare semver strings
function compareVersionStrings(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

// Safe fetch JSON
async function fetchJsonSafe(url) {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  } catch (err) {
    console.warn('fetchJsonSafe failed for', url, err);
    return null;
  }
}

// Build mod card element
function buildModCard(mod) {
  const link = document.createElement('a');
  link.href = `#/mod/${mod.id}`;
  link.className = 'mod-card-link';

  const card = document.createElement('div');
  card.className = 'mod-card';

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.src = mod.iconUrl || '/images/icon.svg';
  img.alt = `${mod.name} icon`;
  img.onerror = () => { img.src = '/images/icon.svg'; };

  const title = document.createElement('h3');
  title.textContent = mod.name || '(Unnamed Mod)';

  const author = document.createElement('div');
  author.className = 'mod-author';
  author.textContent = mod.author ? `By: ${mod.author}` : 'By: Unknown';

  const tagsWrap = document.createElement('div');
  tagsWrap.className = 'mod-tags';
  (mod.tags || []).slice(0, 8).forEach(t => {
    const s = document.createElement('span');
    s.className = 'tag';
    s.textContent = t;
    tagsWrap.appendChild(s);
  });

  if (mod.gameVersion) {
    const v = document.createElement('span');
    v.className = 'tag version';
    v.textContent = `Supports ${mod.gameVersion}`;
    tagsWrap.appendChild(v);
  }

  card.appendChild(img);
  card.appendChild(title);
  card.appendChild(author);
  card.appendChild(tagsWrap);
  link.appendChild(card);

  return link;
}

// Build mod detail view
async function buildModDetail(mod) {
  const wrap = document.createElement('div');
  wrap.className = 'mod-detail';

  // Back link
  const back = document.createElement('a');
  back.href = '';
  back.textContent = '← Back to all mods';
  back.className = 'back-link';
  back.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.hash = '';
  });

  // Header
  const header = document.createElement('div');
  header.className = 'mod-detail-header';

  const img = document.createElement('img');
  img.src = mod.iconUrl || '/images/icon.svg';
  img.alt = `${mod.name} icon`;
  img.onerror = () => { img.src = '/images/icon.svg'; };

  const info = document.createElement('div');
  info.className = 'mod-detail-info';

  const title = document.createElement('h2');
  title.textContent = mod.name;

  const author = document.createElement('p');
  author.textContent = `By: ${mod.author}`;

  const tagsWrap = document.createElement('div');
  tagsWrap.className = 'mod-tags';
  (mod.tags || []).forEach(t => {
    const s = document.createElement('span');
    s.className = 'tag';
    s.textContent = t;
    tagsWrap.appendChild(s);
  });
  if (mod.gameVersion) {
    const v = document.createElement('span');
    v.className = 'tag version';
    v.textContent = `Supports ${mod.gameVersion}`;
    tagsWrap.appendChild(v);
  }

  info.appendChild(title);
  info.appendChild(author);
  info.appendChild(tagsWrap);

  header.appendChild(img);
  header.appendChild(info);

  // Description from polylib.json
  const desc = document.createElement('p');
  desc.className = 'mod-desc';
  let shortdesc = '';
  if (mod.url) {
    const polylib = await fetchJsonSafe(`${mod.url}/polylib.json`);
    if (polylib?.shortdesc) shortdesc = polylib.shortdesc;
  }
  desc.textContent = shortdesc || 'No description available.';

  wrap.appendChild(back);
  wrap.appendChild(header);
  wrap.appendChild(desc);

  return wrap;
}

// Save to cache
function saveCache(data) {
  const entry = { timestamp: Date.now(), data };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (e) {
    console.warn("Failed to save cache:", e);
  }
}

// Load raw cache
function loadCacheRaw() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Failed to read cache:", e);
    return null;
  }
}

// Render mods list
function renderMods(mods) {
  GRID.innerHTML = '';
  mods.forEach(mod => GRID.appendChild(buildModCard(mod)));
  STATUS.textContent = `Showing ${mods.length} mods.`;
}

// Router
async function router(mods) {
  const hash = window.location.hash.replace(/^#\//, '');
  if (hash.startsWith('mod/')) {
    const id = hash.slice(4);
    const mod = mods.find(m => m.id === id);
    if (mod) {
      GRID.innerHTML = '';
      GRID.appendChild(await buildModDetail(mod));
      STATUS.textContent = `Viewing ${mod.name}`;
    } else {
      GRID.innerHTML = 'Mod not found.';
      STATUS.textContent = 'Mod not found.';
    }
  } else {
    renderMods(mods);
  }
}

// Fetch fresh mods
async function fetchModsFresh() {
  const listJson = await fetchJsonSafe(MODLIST_URL);
  if (!listJson) return null;

  const modEntries = Object.entries(listJson);
  const modPromises = modEntries.map(async ([modId, modObj]) => {
    const safeUrlBase = (modObj.url || '').replace(/\/+$/, '');
    const result = {
      id: modId,
      name: modObj.name || modId,
      author: modObj.author || 'Unknown',
      tags: Array.isArray(modObj.tags) ? modObj.tags : (modObj.tags ? [modObj.tags] : []),
      iconUrl: null,
      url: modObj.url || '#',
      gameVersion: null
    };

    if (!safeUrlBase) return result;

    const latestJson = await fetchJsonSafe(`${safeUrlBase}/latest.json`);
    if (latestJson && typeof latestJson === 'object') {
      const gameVersions = Object.keys(latestJson);
      gameVersions.sort(compareVersionStrings);
      const highestGameVersion = gameVersions[gameVersions.length - 1];
      const modVersion = latestJson[highestGameVersion];
      if (modVersion) {
        result.iconUrl = `${safeUrlBase}/${encodeURIComponent(String(modVersion))}/icon.png`;
        result.gameVersion = highestGameVersion;
      }
    }
    return result;
  });

  return Promise.all(modPromises);
}

// Main load
async function loadMods() {
  const cacheEntry = loadCacheRaw();
  let mods = [];

  // Bind router immediately
  window.onhashchange = () => router(mods);

  if (cacheEntry?.data) {
    mods = cacheEntry.data;
    STATUS.textContent = 'Loaded mods from cache.';
    router(mods); // initial render
  } else {
    STATUS.textContent = 'No cache found, fetching mods…';
  }

  // Refresh in background
  const fresh = await fetchModsFresh();
  if (fresh && fresh.length > 0) {
    saveCache(fresh);
    mods = fresh;
    router(mods); // rerender with fresh
    STATUS.textContent = `Showing ${fresh.length} mods (updated).`;
  } else if (!cacheEntry?.data) {
    STATUS.textContent = 'Failed to load mod list.';
  }
}

// Start
loadMods().catch(err => {
  console.error(err);
  STATUS.textContent = 'An unexpected error occurred while loading mods.';
});
