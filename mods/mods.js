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

function buildModCard(mod) {
  const link = document.createElement('a');
  link.href = mod.url || '#';
  link.className = 'mod-card-link';
  link.target = '_blank';
  link.rel = 'noopener';

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

  card.appendChild(img);
  card.appendChild(title);
  card.appendChild(author);
  card.appendChild(tagsWrap);
  link.appendChild(card);

  return link;
}

async function loadMods() {
  STATUS.textContent = 'Fetching mod list…';
  const listJson = await fetchJsonSafe(MODLIST_URL);
  if (!listJson) {
    STATUS.textContent = 'Failed to load mod list.';
    return;
  }

  const modEntries = Object.entries(listJson);
  if (modEntries.length === 0) {
    STATUS.textContent = 'No mods found.';
    return;
  }

  STATUS.textContent = `Found ${modEntries.length} mods — resolving latest versions…`;

  const modPromises = modEntries.map(async ([modId, modObj]) => {
    const safeUrlBase = (modObj.url || '').replace(/\/+$/, '');
    const result = {
      id: modId,
      name: modObj.name || modId,
      author: modObj.author || 'Unknown',
      tags: Array.isArray(modObj.tags) ? modObj.tags : (modObj.tags ? [modObj.tags] : []),
      iconUrl: null,
      url: modObj.url || '#'
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
        try {
          const test = await fetch(result.iconUrl, { method: 'HEAD' });
          if (!test.ok) result.iconUrl = '/images/icon.svg';
        } catch (e) { result.iconUrl = '/images/icon.svg'; }
      }
    }
    return result;
  });

  const resolved = await Promise.all(modPromises);
  GRID.innerHTML = '';
  resolved.forEach(mod => GRID.appendChild(buildModCard(mod)));
  STATUS.textContent = `Showing ${resolved.length} mods.`;
}

loadMods().catch(err => {
  console.error(err);
  STATUS.textContent = 'An unexpected error occurred while loading mods.';
});
