// mods.js

const menuBtn = document.getElementById("menu-btn");
const sideMenu = document.getElementById("side-menu");
const STATUS = document.getElementById("status");
const GRID = document.getElementById("mods-grid");
const MOD_DETAIL = document.getElementById("mod-detail");
const MODS_SECTION = document.querySelector(".mods");

menuBtn.addEventListener("click", () => {
  const open = sideMenu.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  sideMenu.setAttribute("aria-hidden", open ? "false" : "true");
});

const MODLIST_URL =
  "https://raw.githubusercontent.com/polytrackmods/PolyLibrary/refs/heads/main/modlist.json";
const JSON_CACHE_KEY = "jsonCache";

// ---------- utils ----------

function compareVersionStrings(a, b) {
  const pa = String(a)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

// ---------- JSON cache ----------

const jsonCache = new Map();
const inflightJson = new Map();

function loadJsonCache() {
  try {
    const raw = localStorage.getItem(JSON_CACHE_KEY);
    if (!raw) return;
    Object.entries(JSON.parse(raw)).forEach(([k, v]) => jsonCache.set(k, v));
  } catch {}
}

function saveJsonCache() {
  try {
    localStorage.setItem(
      JSON_CACHE_KEY,
      JSON.stringify(Object.fromEntries(jsonCache)),
    );
  } catch {}
}

async function fetchJsonFresh(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error();
    return await r.json();
  } catch {
    return null;
  }
}

async function fetchJsonCached(url) {
  if (!url) return null;
  if (jsonCache.has(url)) return jsonCache.get(url);
  if (inflightJson.has(url)) return inflightJson.get(url);

  const p = (async () => {
    try {
      const r = await fetch(url, { cache: "no-cache" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      jsonCache.set(url, data);
      saveJsonCache();
      return data;
    } catch {
      return null;
    } finally {
      inflightJson.delete(url);
    }
  })();

  inflightJson.set(url, p);
  return p;
}

// ---------- card rendering ----------

function buildModCard(mod) {
  const link = document.createElement("a");
  link.href = `#/mod/${encodeURIComponent(mod.id)}`;
  link.className = "mod-card-link";

  const card = document.createElement("div");
  card.className = "mod-card";
  card.dataset.modId = mod.id;

  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.src = "/images/icon.svg";
  img.alt = `${mod.name} icon`;

  const title = document.createElement("h3");
  title.textContent = mod.name || "(Unnamed Mod)";

  const author = document.createElement("div");
  author.className = "mod-author";
  author.textContent = mod.author ? `By: ${mod.author}` : "By: Unknown";

  const tags = document.createElement("div");
  tags.className = "mod-tags";
  (mod.tags || []).slice(0, 8).forEach((t) => {
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = t;
    tags.appendChild(s);
  });

  card.append(img, title, author, tags);
  link.appendChild(card);
  return link;
}

function patchModCard(mod) {
  if (!mod.gameVersion) return;
  const card = document.querySelector(`[data-mod-id="${mod.id}"]`);
  if (!card) return;

  const tags = card.querySelector(".mod-tags");
  if (tags.querySelector(".version")) return;

  const v = document.createElement("span");
  v.className = "tag version";
  v.textContent = `Supports ${mod.gameVersion}`;
  tags.appendChild(v);
}

// ---------- detail view ----------

async function buildModDetail(mod) {
  const wrap = document.createElement("div");
  wrap.className = "mod-detail-inner";

  const back = document.createElement("a");
  back.href = "#/";
  back.className = "back-link";
  back.textContent = "← Back to all mods";
  back.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = "";
  });

  const header = document.createElement("div");
  header.className = "mod-detail-header";

  const icon = document.createElement("img");
  const cardImg = document.querySelector(`[data-mod-id="${mod.id}"] img`);
  icon.src = cardImg?.src || "/images/icon.svg";
  icon.onerror = () => (icon.src = "/images/icon.svg");

  const info = document.createElement("div");
  info.className = "mod-detail-info";

  const title = document.createElement("h2");
  title.textContent = mod.name;

  const author = document.createElement("p");
  author.className = "mod-author";
  author.textContent = `By: ${mod.author}`;

  const tags = document.createElement("div");
  tags.className = "mod-tags";
  (mod.tags || []).forEach((t) => {
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = t;
    tags.appendChild(s);
  });

  if (mod.gameVersion) {
    const gv = document.createElement("span");
    gv.className = "tag version";
    gv.textContent = `Supports ${mod.gameVersion}`;
    tags.appendChild(gv);
  }

  info.append(title, author, tags);

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.textContent = "📋 Copy Import";
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(mod.url);
      copyBtn.textContent = "✅ Copied!";
      setTimeout(() => (copyBtn.textContent = "📋 Copy Import"), 2000);
    } catch {
      copyBtn.textContent = "❌ Failed";
    }
  });

  header.append(icon, info, copyBtn);

  const desc = document.createElement("p");
  desc.className = "mod-desc";
  desc.textContent = mod.polylib?.shortdesc || "No description available.";

  const versionsWrap = document.createElement("div");
  versionsWrap.className = "mod-versions";

  async function ensureManifest(version) {
    if (mod.manifests[version]) return mod.manifests[version];
    const base = mod.url?.replace(/\/+$/, "");
    if (!base) return null;
    const m = await fetchJsonCached(
      `${base}/${encodeURIComponent(version)}/manifest.json`,
    );
    if (m) mod.manifests[version] = m;
    return m;
  }

  if (!mod.versions?.length) {
    const empty = document.createElement("div");
    empty.className = "no-versions";
    empty.textContent = "No version information available.";
    versionsWrap.appendChild(empty);
  } else {
    for (const v of mod.versions) {
      const manifest = (await ensureManifest(v)) || {};
      const polymod = manifest.polymod || manifest;

      const block = document.createElement("div");
      block.className = "mod-version";

      const vh = document.createElement("div");
      vh.className = "version-header";

      const left = document.createElement("div");
      left.className = "version-left";
      left.textContent = v;

      const right = document.createElement("div");
      right.className = "version-right";

      const targets = Array.isArray(polymod.targets)
        ? polymod.targets
        : polymod.targets
          ? [polymod.targets]
          : [];

      right.textContent = targets.length
        ? `PolyTrack ${targets.join(", ")}`
        : "";
      vh.append(left, right);

      const changelog = document.createElement("div");
      changelog.className = "changelog";
      changelog.style.display = "none";

      const ul = document.createElement("ul");
      ul.className = "version-changelog";

      const entries = mod.polylib?.changelogs?.[v];
      if (Array.isArray(entries)) {
        for (const e of entries) {
          const li = document.createElement("li");
          li.textContent = e;
          ul.appendChild(li);
        }
      } else {
        const li = document.createElement("li");
        li.textContent = "No changelog found.";
        ul.appendChild(li);
      }

      changelog.appendChild(ul);
      vh.addEventListener("click", () => {
        changelog.style.display =
          changelog.style.display === "none" ? "block" : "none";
      });

      block.append(vh, changelog);
      versionsWrap.appendChild(block);
    }
  }

  wrap.append(back, header, desc, versionsWrap);
  return wrap;
}

// ---------- enrichment ----------

const ENRICH_LIMIT = 4;
const enrichQueue = [];
let enrichRunning = 0;
let totalMods = 0;
let enrichedMods = 0;

function enrichMod(mod) {
  enrichQueue.push(mod);
  runEnrichQueue();
}

async function runEnrichQueue() {
  if (enrichRunning >= ENRICH_LIMIT) return;
  const mod = enrichQueue.shift();
  if (!mod) return;

  enrichRunning++;
  try {
    await enrichModInternal(mod);
  } finally {
    enrichRunning--;
    runEnrichQueue();
  }
}

async function enrichModInternal(mod) {
  const base = mod.url?.replace(/\/+$/, "");
  if (!base) return;

  mod.polylib = await fetchJsonCached(`${base}/polylib.json`);

  const latest = await fetchJsonCached(`${base}/latest.json`);
  if (latest && typeof latest === "object") {
    mod.gameVersion = Object.keys(latest).sort(compareVersionStrings).at(-1);
  }

  const listing = await fetchJsonCached(`${base}/`);
  if (!Array.isArray(listing)) return;

  mod.versions = listing
    .filter((e) => e.type === "dir" && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort(compareVersionStrings)
    .reverse();

  if (mod.versions.length) {
    const v = mod.versions[0];
    mod.iconUrl = `${base}/${encodeURIComponent(v)}/icon.png`;

    const manifest = await fetchJsonCached(
      `${base}/${encodeURIComponent(v)}/manifest.json`,
    );
    if (manifest) mod.manifests[v] = manifest;
  }

  patchModCard(mod);

  if (++enrichedMods === totalMods) startIconLoading();
}

function startIconLoading() {
  for (const card of document.querySelectorAll(".mod-card")) {
    const mod = mods.find((m) => m.id === card.dataset.modId);
    if (!mod?.iconUrl) continue;

    const img = card.querySelector("img");
    img.src = mod.iconUrl;
    img.onerror = () => (img.src = "/images/icon.svg");
  }
}

// ---------- router ----------

async function showModDetail(mod) {
  MODS_SECTION.style.display = "none";
  MOD_DETAIL.innerHTML = "";
  MOD_DETAIL.style.display = "";
  MOD_DETAIL.appendChild(await buildModDetail(mod));
  STATUS.textContent = `Viewing ${mod.name}`;
}

async function router(mods) {
  const hash = (window.location.hash || "").replace(/^#\//, "");

  if (hash.startsWith("mod/")) {
    const mod = mods.find((m) => m.id === decodeURIComponent(hash.slice(4)));
    if (mod) return showModDetail(mod);

    MOD_DETAIL.innerHTML =
      '<div class="mod-detail"><p>Mod not found.</p><p><a href="#/">Back</a></p></div>';
    MOD_DETAIL.style.display = "";
    MODS_SECTION.style.display = "none";
    STATUS.textContent = "Mod not found.";
  } else {
    MOD_DETAIL.style.display = "none";
    MOD_DETAIL.innerHTML = "";
    MODS_SECTION.style.display = "";
    STATUS.textContent = `Showing ${mods.length} mods.`;
  }
}

// ---------- entry ----------

function addModFromList(id, obj) {
  const mod = {
    id,
    name: obj.name || id,
    author: obj.author || "Unknown",
    tags: Array.isArray(obj.tags) ? obj.tags : [],
    url: obj.url || "#",
    versions: [],
    manifests: {},
    polylib: null,
    gameVersion: null,
    iconUrl: null,
  };

  mods.push(mod);
  GRID.appendChild(buildModCard(mod));
  enrichMod(mod);
}

const mods = [];

async function loadMods() {
  loadJsonCache();
  window.onhashchange = () => router(mods);

  GRID.innerHTML = "";
  STATUS.textContent = "Loading mods…";

  // ---- Phase A: cache-first ----
  const cachedList = jsonCache.get(MODLIST_URL);
  if (cachedList) {
    for (const [id, obj] of Object.entries(cachedList)) {
      addModFromList(id, obj);
    }
    STATUS.textContent = `Loaded ${mods.length} mods (cached)…`;
  }

  // ---- Phase B: background refresh ----
  const freshList = await fetchJsonFresh(MODLIST_URL);
  if (!freshList) {
    if (!cachedList) STATUS.textContent = "Failed to load mod list.";
    return;
  }

  // Update cache
  jsonCache.set(MODLIST_URL, freshList);
  saveJsonCache();

  // Add only NEW mods
  for (const [id, obj] of Object.entries(freshList)) {
    if (mods.some((m) => m.id === id)) continue;
    addModFromList(id, obj);
  }

  totalMods = mods.length;
  STATUS.textContent = `Showing ${mods.length} mods.`;
}

loadMods().catch((err) => {
  console.error(err);
  STATUS.textContent = "An unexpected error occurred.";
});
