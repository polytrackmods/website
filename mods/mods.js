const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const STATUS = document.getElementById('status');
const GRID = document.getElementById('mods-grid');
const MOD_DETAIL = document.getElementById('mod-detail');
const MODS_SECTION = document.querySelector('.mods');

menuBtn.addEventListener('click', () => {
  const open = sideMenu.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  sideMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
});

const MODLIST_URL = 'https://raw.githubusercontent.com/polytrackmods/PolyLibrary/refs/heads/main/modlist.json';
const CACHE_KEY = 'modsCache';
const JSON_CACHE_KEY = 'jsonCache';

function compareVersionStrings(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0, nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

// --- JSON caching helpers ---
const jsonCache = new Map();

function loadJsonCache() {
  try {
    const raw = localStorage.getItem(JSON_CACHE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    Object.entries(obj).forEach(([k, v]) => jsonCache.set(k, v));
  } catch (e) {
    console.warn('Failed to load JSON cache:', e);
  }
}

function saveJsonCache() {
  try {
    const obj = Object.fromEntries(jsonCache);
    localStorage.setItem(JSON_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('Failed to save JSON cache:', e);
  }
}

async function fetchJsonCached(url) {
  if (jsonCache.has(url)) return jsonCache.get(url);
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const data = await r.json();
    jsonCache.set(url, data);
    saveJsonCache();
    return data;
  } catch (e) {
    console.warn('fetchJsonCached failed for', url, e);
    return null;
  }
}

// --- Mod cache helpers ---
function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (e) { console.warn('Failed to save cache:', e); }
}
function loadCacheRaw() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { console.warn('Failed to read cache:', e); return null; }
}

// --- Build cards ---
function buildModCard(mod) {
  const link = document.createElement('a');
  link.href = `#/mod/${encodeURIComponent(mod.id)}`;
  link.className = 'mod-card-link';

  const card = document.createElement('div'); card.className = 'mod-card';
  const img = document.createElement('img'); img.loading = 'lazy';
  img.src = mod.iconUrl || '/images/icon.svg';
  img.alt = `${mod.name} icon`;
  img.onerror = () => { img.src = '/images/icon.svg'; };
  const title = document.createElement('h3'); title.textContent = mod.name || '(Unnamed Mod)';
  const author = document.createElement('div'); author.className = 'mod-author'; author.textContent = mod.author ? `By: ${mod.author}` : 'By: Unknown';
  const tagsWrap = document.createElement('div'); tagsWrap.className = 'mod-tags';
  (mod.tags || []).slice(0, 8).forEach(t => { const s = document.createElement('span'); s.className = 'tag'; s.textContent = t; tagsWrap.appendChild(s); });
  if (mod.gameVersion) { const v = document.createElement('span'); v.className = 'tag version'; v.textContent = `Supports ${mod.gameVersion}`; tagsWrap.appendChild(v); }

  card.append(img, title, author, tagsWrap);
  link.appendChild(card);
  return link;
}

// --- Build detail ---
async function buildModDetail(mod) {
  const wrap = document.createElement('div');
  wrap.className = 'mod-detail-inner';

  const back = document.createElement('a');
  back.href = '';
  back.textContent = '← Back to all mods';
  back.className = 'back-link';
  back.addEventListener('click', e => {
    e.preventDefault();
    window.location.hash = '';
  });

  const header = document.createElement('div');
  header.className = 'mod-detail-header';
  const icon = document.createElement('img');
  icon.src = mod.iconUrl || '/images/icon.svg';
  icon.alt = `${mod.name} icon`;
  icon.onerror = () => { icon.src = '/images/icon.svg'; };

  const info = document.createElement('div'); info.className = 'mod-detail-info';
  const title = document.createElement('h2'); title.textContent = mod.name;
  const author = document.createElement('p'); author.className = 'mod-author'; author.textContent = `By: ${mod.author}`;
  const tagsWrap = document.createElement('div'); tagsWrap.className = 'mod-tags';
  (mod.tags || []).forEach(t => { const s = document.createElement('span'); s.className = 'tag'; s.textContent = t; tagsWrap.appendChild(s); });

  info.append(title, author, tagsWrap);
  header.append(icon, info);

  const desc = document.createElement('p');
  desc.className = 'mod-desc';
  desc.textContent = mod.polylib?.shortdesc || 'No description available.';

  const versionsWrap = document.createElement('div'); versionsWrap.className = 'mod-versions';
  if (!mod.versions || !mod.versions.length) {
    const empty = document.createElement('div'); empty.className = 'no-versions'; empty.textContent = 'No version information available.'; versionsWrap.appendChild(empty);
  } else {
    mod.versions.forEach(versionFolder => {
      const polymod = mod.manifests?.[versionFolder]?.polymod || mod.manifests?.[versionFolder] || {};

      const versionBlock = document.createElement('div'); versionBlock.className = 'mod-version';
      const vHeader = document.createElement('div'); vHeader.className = 'version-header';
      const versionInfo = document.createElement('div');
      versionInfo.textContent = versionFolder + (polymod.releaseDate ? ` (${polymod.releaseDate})` : '');
      vHeader.appendChild(versionInfo);

      if (polymod.gameVersion) {
        const support = document.createElement('div');
        support.className = 'version-support';
        support.textContent = `Supports ${polymod.gameVersion}`;
        versionBlock.appendChild(support);
      }

      const changelogWrap = document.createElement('div'); changelogWrap.className = 'changelog'; changelogWrap.style.display = 'none';
      const detailsList = document.createElement('ul'); detailsList.className = 'version-changelog';
      let changelogEntries = [];
      if (mod.polylib?.changelogs) {
        const candidate = mod.polylib.changelogs[versionFolder];
        if (Array.isArray(candidate)) changelogEntries = candidate;
        else if (typeof candidate === 'string') changelogEntries = candidate.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      }
      if (!changelogEntries.length) { const li = document.createElement('li'); li.textContent = 'No changelog found.'; detailsList.appendChild(li); }
      else changelogEntries.forEach(entry => { const li = document.createElement('li'); li.textContent = entry; detailsList.appendChild(li); });

      changelogWrap.appendChild(detailsList);
      vHeader.addEventListener('click', () => { changelogWrap.style.display = changelogWrap.style.display === 'none' ? 'block' : 'none'; });

      versionBlock.append(vHeader, changelogWrap);
      versionsWrap.appendChild(versionBlock);
    });
  }

  wrap.append(back, header, desc, versionsWrap);
  return wrap;
}

// --- Rendering ---
function renderMods(mods) { GRID.innerHTML = ''; mods.forEach(mod => GRID.appendChild(buildModCard(mod))); STATUS.textContent = `Showing ${mods.length} mods.`; MOD_DETAIL.style.display = 'none'; MODS_SECTION.style.display = ''; }
async function showModDetail(mod) { GRID.innerHTML = ''; MODS_SECTION.style.display = 'none'; MOD_DETAIL.innerHTML = ''; MOD_DETAIL.style.display = ''; const node = await buildModDetail(mod); MOD_DETAIL.appendChild(node); STATUS.textContent = `Viewing ${mod.name}`; }

async function router(mods) {
  const hash = (window.location.hash || '').replace(/^#\//, '');
  if (hash.startsWith('mod/')) {
    const id = decodeURIComponent(hash.slice(4));
    const mod = mods.find(m => m.id === id);
    if (mod) { await showModDetail(mod); }
    else { MOD_DETAIL.innerHTML = '<div class="mod-detail"><p>Mod not found.</p><p><a href="#/">Back</a></p></div>'; MOD_DETAIL.style.display = ''; MODS_SECTION.style.display = 'none'; STATUS.textContent = 'Mod not found.'; }
  } else renderMods(mods);
}

// --- Fetch mods ---
async function fetchModsFresh() {
  const listJson = await fetchJsonCached(MODLIST_URL);
  if (!listJson) return null;
  const entries = Object.entries(listJson);

  const results = await Promise.all(entries.map(async ([modId, modObj]) => {
    const safeUrlBase = (modObj.url || '').replace(/\/+$/, '');
    const result = {
      id: modId,
      name: modObj.name || modId,
      author: modObj.author || 'Unknown',
      tags: Array.isArray(modObj.tags) ? modObj.tags : (modObj.tags ? [modObj.tags] : []),
      iconUrl: '/images/icon.svg',
      url: modObj.url || '#',
      gameVersion: null,
      versions: [],
      manifests: {},
      polylib: null
    };
    if (!safeUrlBase) return result;

    result.polylib = await fetchJsonCached(`${safeUrlBase}/polylib.json`);
    const foldersJson = await fetchJsonCached(`${safeUrlBase}/`);
    if (Array.isArray(foldersJson)) {
      const dirFolders = foldersJson.filter(f => f.type === 'dir' && !f.name.startsWith('.'));
      const manifestPromises = dirFolders.map(async f => {
        const manifestUrl = `${safeUrlBase}/${encodeURIComponent(f.name)}/manifest.json`;
        const manifest = await fetchJsonCached(manifestUrl);
        if (manifest) result.manifests[f.name] = manifest;
        return manifest ? f.name : null;
      });

      const versionFolders = (await Promise.all(manifestPromises)).filter(Boolean)
        .sort(compareVersionStrings).reverse(); // newest first
      result.versions = versionFolders;

      let newestGameVersion = null;
      for (const v of versionFolders) {
        const polymod = result.manifests[v]?.polymod || result.manifests[v] || {};
        if (polymod.gameVersion && (!newestGameVersion || compareVersionStrings(polymod.gameVersion, newestGameVersion) > 0)) {
          newestGameVersion = polymod.gameVersion;
        }
        // pick first existing icon
        if (!result.iconUrl || result.iconUrl === '/images/icon.svg') {
          const iconCandidate = `${safeUrlBase}/${encodeURIComponent(v)}/icon.png`;
          try {
            const r = await fetch(iconCandidate, { method: 'HEAD' });
            if (r.ok) result.iconUrl = iconCandidate;
          } catch {}
        }
      }
      result.gameVersion = newestGameVersion;
    }

    return result;
  }));

  return results;
}

async function loadMods() {
  loadJsonCache();
  const cacheEntry = loadCacheRaw();
  let mods = [];
  window.onhashchange = () => router(mods);

  if (cacheEntry?.data) { mods = cacheEntry.data; STATUS.textContent = 'Loaded mods from cache.'; router(mods); }
  else STATUS.textContent = 'Fetching mods…';

  const fresh = await fetchModsFresh();
  if (fresh && fresh.length > 0) { saveCache(fresh); mods = fresh; router(mods); STATUS.textContent = `Showing ${mods.length} mods (updated).`; }
  else if (!cacheEntry?.data) STATUS.textContent = 'Failed to load mod list.';
}

loadMods().catch(err => { console.error(err); STATUS.textContent = 'An unexpected error occurred while loading mods.'; });
