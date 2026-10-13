/* MeilleurFlan — application de la page d'accueil */
(() => {
'use strict';

/* =========================================================================
   Configuration
   ========================================================================= */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC8ggwK5WfFGmpjzaHuxc-tkwRnKUm-C94',
  authDomain: 'meilleurflan.firebaseapp.com',
  projectId: 'meilleurflan',
  storageBucket: 'meilleurflan.firebasestorage.app',
  messagingSenderId: '1004619012500',
  appId: '1:1004619012500:web:d98b09d4d4fe5ca86a1781'
};

// Photos : renseigner le « cloud name » et le nom du « upload preset » non signé Cloudinary.
// Tant que ces deux valeurs sont vides, les boutons photo restent masqués.
const CLOUDINARY = { cloud: '', preset: '' };
const photosOn = () => Boolean(CLOUDINARY.cloud && CLOUDINARY.preset);

const PRIX = [
  { v: 'Moins de 3€', l: '< 3 €', n: 2.8 },
  { v: '3,50€', l: '3,50 €', n: 3.5 },
  { v: '4€', l: '4 €', n: 4 },
  { v: '4,50€', l: '4,50 €', n: 4.5 },
  { v: '5€', l: '5 €', n: 5 },
  { v: 'Plus de 5€', l: '> 5 €', n: 5.5 }
];
const TEXTURES = [
  { v: 'Crémeux', h: 'Ça tremblote' },
  { v: 'Classique', h: 'Ferme et fondant' },
  { v: 'Compact', h: 'Bien dense' },
  { v: 'Coulant', h: 'Prévoir une serviette' }
];
const PATES = [
  { v: 'Feuilletée et croustillante', l: 'Feuilletée', h: 'Ça fait crac' },
  { v: 'Brisée et beurrée', l: 'Brisée', h: 'Fondante et beurrée' }
];
const PAGE = 7;
const NEAR_KM = 30;
const CITY_COORDS = {
  Paris: [48.8566, 2.3522], Lyon: [45.7640, 4.8357], Grenoble: [45.1885, 5.7245],
  Bordeaux: [44.8378, -0.5792], Rennes: [48.1173, -1.6778], Sisteron: [44.1978, 5.9450],
  Marseille: [43.2965, 5.3698], Toulouse: [43.6047, 1.4442], Nantes: [47.2184, -1.5536],
  Strasbourg: [48.5734, 7.7521], Lille: [50.6292, 3.0573], Nice: [43.7102, 7.2620]
};
const FRANCE = [46.6, 2.3];

/* =========================================================================
   Outils
   ========================================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* navigation privée */ } }
};
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function haversine(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function fmtDist(m) {
  if (m == null) return '';
  if (m < 1000) return `à ${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `à ${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`;
}
const prixInfo = (v) => PRIX.find((p) => p.v === v) || { v, l: v || '?', n: 99 };
const pateShort = (v) => (PATES.find((p) => p.v === v) || { l: v || '' }).l;
const hashNum = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };

const SLICE = '<svg class="slice" viewBox="0 40 260 140" aria-hidden="true"><path d="M40 118 L236 92 L236 142 L40 168 Z" fill="#FFEDB8" stroke="#D9913F" stroke-width="2" stroke-linejoin="round"/><path d="M40 156 L236 130 L236 142 L40 168 Z" fill="#E9AE62"/><path d="M236 92 Q248 102 246 120 L246 134 Q244 140 236 142 Z" fill="#E2A257"/><path d="M40 118 L150 58 Q205 54 236 92 Z" fill="#D9772A"/><path d="M150 58 Q205 54 236 92" stroke="#EDB66C" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="110" cy="84" r="5" fill="#8A3508" opacity=".4"/><circle cx="170" cy="74" r="4" fill="#8A3508" opacity=".4"/><circle cx="200" cy="86" r="3" fill="#F3A55A"/><circle cx="96" cy="136" r="2" fill="#3A2412" opacity=".45"/><circle cx="160" cy="128" r="2" fill="#3A2412" opacity=".45"/></svg>';
const SLICE_HERO = '<svg viewBox="0 0 260 200" style="width:100%;filter:drop-shadow(0 22px 18px rgba(150,70,10,.28))" aria-hidden="true"><defs><linearGradient id="hCut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3CC"/><stop offset="1" stop-color="#FFD780"/></linearGradient><linearGradient id="hTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E58A3A"/><stop offset="1" stop-color="#C9651F"/></linearGradient><pattern id="hBurn" width="26" height="18" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="4" fill="#8A3508" opacity=".45"/><circle cx="18" cy="12" r="2.6" fill="#F3A55A" opacity=".75"/></pattern></defs><path d="M40 118 L236 92 L236 142 L40 168 Z" fill="url(#hCut)" stroke="#D9913F" stroke-width="1.2" stroke-linejoin="round"/><path d="M40 156 L236 130 L236 142 L40 168 Z" fill="#E9AE62"/><path d="M236 92 Q248 102 246 120 L246 134 Q244 140 236 142 Z" fill="#E2A257" stroke="#D9913F" stroke-width="1.2" stroke-linejoin="round"/><path d="M40 118 L150 58 Q205 54 236 92 Z" fill="url(#hTop)"/><path d="M40 118 L150 58 Q205 54 236 92 Z" fill="url(#hBurn)"/><path d="M150 58 Q205 54 236 92" stroke="#EDB66C" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="80" cy="132" r="1.6" fill="#3A2412" opacity=".55"/><circle cx="120" cy="140" r="1.4" fill="#3A2412" opacity=".5"/><circle cx="158" cy="122" r="1.6" fill="#3A2412" opacity=".55"/><circle cx="196" cy="130" r="1.4" fill="#3A2412" opacity=".5"/></svg>';
const HEART = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.3-9.5C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 7C19.5 16.4 12 21 12 21z"/></svg>';
const ICO_GO = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 21 3l-8 18-2-8z"/></svg>';
const ICO_SHOP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h16l-1 10H5z"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const ICO_PIN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
const ICO_FLAN = '<svg width="18" height="18" viewBox="0 0 40 40" aria-hidden="true"><path d="M5 22 L35 17 L35 28 L5 33 Z" fill="#FFE3A3"/><path d="M5 22 L21 11 Q31 11 35 17 Z" fill="#D9772A"/></svg>';

function imgUrl(url, w, h) {
  if (!url) return '';
  return url.includes('/upload/') ? url.replace('/upload/', `/upload/c_fill,g_auto,w_${w},h_${h},q_auto,f_auto/`) : url;
}

/* Toast & confettis */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}
function confetti(x, y, n = 18) {
  const colors = ['#F29A4A', '#FFE08C', '#E2456B', '#C24E0C', '#FFF1CF', '#241C17'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'mf-confetti';
    el.style.cssText = `left:${x + (Math.random() - .5) * 140}px;top:${y + (Math.random() - .5) * 50}px;background:${colors[i % colors.length]};border-radius:${Math.random() > .5 ? '50%' : '2px'};animation-duration:${.7 + Math.random() * .6}s`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* Contrôle de contenu (repris de la version précédente) */
const PROFANITY = ['merde', 'putain', 'connard', 'connasse', 'salope', 'fdp', 'nique', 'encule', 'baise', 'bordel', 'pute', 'chiotte', 'couille', 'branleur', 'batard'];
function contentOk(s) {
  if (!s) return true;
  const n = norm(s);
  if (PROFANITY.some((w) => new RegExp(`\\b${w}`).test(n))) return false;
  const l = s.toLowerCase().replace(/\s/g, '');
  if (l.length < 2) return true;
  if (/[^aeiouyéèêëàâùûüîïôœ0-9]{7,}/.test(l)) return false;
  if (/(.)\1{4,}/.test(l)) return false;
  const letters = (l.match(/[a-zéèêëàâùûüîïôœ]/g) || []).length;
  return !(l.length > 5 && letters / l.length < 0.45);
}

/* =========================================================================
   État
   ========================================================================= */
const S = {
  flans: [],
  loaded: false,
  city: 'all',
  view: 'list',
  sort: 'likes',
  texture: '',
  pate: '',
  query: '',
  userPos: null,
  selId: null,
  showAll: false
};
const liked = store.get('mf_liked', {});
const geoCache = store.get('mf_geo', {});
Object.assign(CITY_COORDS, geoCache);

const visible = () => S.flans.filter((f) => !f.reported && f.approved !== false);

function cityCoords(ville) {
  if (CITY_COORDS[ville]) return CITY_COORDS[ville];
  const k = Object.keys(CITY_COORDS).find((c) => norm(c) === norm(ville));
  return k ? CITY_COORDS[k] : null;
}
async function geocodeCity(ville) {
  const known = cityCoords(ville);
  if (known) return known;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ville + ', France')}&format=json&limit=1`, { headers: { 'Accept-Language': 'fr' } });
    const d = await r.json();
    if (d && d[0]) {
      const c = [parseFloat(d[0].lat), parseFloat(d[0].lon)];
      CITY_COORDS[ville] = c; geoCache[ville] = c; store.set('mf_geo', geoCache);
      return c;
    }
  } catch (e) { /* hors ligne */ }
  return null;
}

/* Position d'un flan : exacte si l'adresse est connue, sinon centre de la ville (légèrement décalé) */
function posOf(f) {
  if (typeof f.lat === 'number' && typeof f.lng === 'number') return { ll: [f.lat, f.lng], exact: true };
  const c = cityCoords(f.ville);
  if (!c) return null;
  const h = hashNum(f.id);
  return { ll: [c[0] + ((h % 100) / 100 - .5) * .016, c[1] + (((h >> 8) % 100) / 100 - .5) * .022], exact: false };
}
function distOf(f) {
  if (!S.userPos) return null;
  const p = posOf(f);
  return p ? haversine(S.userPos, p.ll) : null;
}
function distLabel(f) {
  const p = posOf(f);
  return p && p.exact && S.userPos ? fmtDist(haversine(S.userPos, p.ll)) : '';
}
const placeLabel = (f) => f.quartier || f.ville;

function cityList() {
  const c = {};
  visible().forEach((f) => { c[f.ville] = (c[f.ville] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}
function canonCity(name) {
  const hit = cityList().find((c) => norm(c.name) === norm(name));
  return hit ? hit.name : name;
}
const inCity = (f) => S.city === 'all' || norm(f.ville) === norm(S.city);
const byLikes = (a, b) => (b.likes || 0) - (a.likes || 0) || (a.ts || 0) - (b.ts || 0);

function currentList() {
  const q = norm(S.query);
  let l = visible().filter(inCity)
    .filter((f) => !S.texture || f.appareil === S.texture)
    .filter((f) => !S.pate || f.pate === S.pate)
    .filter((f) => !q || norm(`${f.boulangerie} ${f.nom} ${f.ville} ${f.quartier || ''}`).includes(q));
  if (S.sort === 'near' && S.userPos) l = l.sort((a, b) => (distOf(a) ?? 1e12) - (distOf(b) ?? 1e12));
  else if (S.sort === 'price') l = l.sort((a, b) => prixInfo(a.prix).n - prixInfo(b.prix).n || byLikes(a, b));
  else l = l.sort(byLikes);
  return l;
}
const cityRank = (f) => visible().filter((x) => norm(x.ville) === norm(f.ville)).sort(byLikes).findIndex((x) => x.id === f.id) + 1;
const goUrl = (f) => (typeof f.lat === 'number'
  ? `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.boulangerie} ${f.adresse || f.ville}`)}`);

/* =========================================================================
   Rendu
   ========================================================================= */
function render() {
  renderHero();
  renderChips();
  renderToolbar();
  if (S.view === 'list') renderList(); else renderMap();
}

function renderHero() {
  const eyebrow = $('#hero-eyebrow');
  const title = $('#hero-title');
  if (!S.loaded) return;
  const pool = visible().filter(inCity).sort(byLikes);
  const where = S.city === 'all' ? 'France' : S.city;
  const n = pool.length;
  eyebrow.textContent = n
    ? `${n} flan${n > 1 ? 's' : ''} goûté${n > 1 ? 's' : ''} ${S.city === 'all' ? 'en France' : `à ${S.city}`}. Pour la science.`
    : `Pas encore de flan noté à ${where}.`;
  const top = pool[0];
  const answer = top
    ? `C'est chez <a href="#flan-${esc(top.id)}" data-open="${esc(top.id)}">${esc(top.boulangerie)}</a>${S.city === 'all' ? `, à ${esc(top.ville)}` : ''}.`
    : 'À toi de nous le dire.';
  title.innerHTML = `Le meilleur flan de ${esc(where)} ?<span class="hero-answer">${answer}</span>`;
  document.title = S.city === 'all'
    ? 'MeilleurFlan.fr — Le classement des meilleurs flans pâtissiers de France'
    : `Meilleur flan à ${S.city} — le classement MeilleurFlan.fr`;
}

function renderChips() {
  const cities = cityList();
  const top = cities.slice(0, 5);
  const isTop = top.some((c) => norm(c.name) === norm(S.city));
  let html = `<button type="button" class="mf-chip ${S.city === 'all' ? 'is-on' : ''}" data-city="all" aria-pressed="${S.city === 'all'}">Toute la France</button>`;
  if (S.city !== 'all' && !isTop) {
    const c = cities.find((x) => norm(x.name) === norm(S.city));
    html += `<button type="button" class="mf-chip is-on" data-city="${esc(S.city)}" aria-pressed="true">${esc(S.city)} <small>${c ? c.count : 0}</small></button>`;
  }
  html += top.map((c) => {
    const on = norm(c.name) === norm(S.city);
    return `<button type="button" class="mf-chip ${on ? 'is-on' : ''}" data-city="${esc(c.name)}" aria-pressed="${on}">${esc(c.name)} <small>${c.count}</small></button>`;
  }).join('');
  const others = cities.slice(5);
  if (others.length) {
    html += `<label class="sr-only" for="other-cities">Autres villes</label><select class="mf-chip" id="other-cities"><option value="">Autres villes</option>${others.map((c) => `<option value="${esc(c.name)}">${esc(c.name)} (${c.count})</option>`).join('')}</select>`;
  }
  $('#city-chips').innerHTML = html;
}

function renderToolbar() {
  $('#tab-list').setAttribute('aria-selected', S.view === 'list');
  $('#tab-map').setAttribute('aria-selected', S.view === 'map');
  $('#view-list').hidden = S.view !== 'list';
  $('#view-map').hidden = S.view !== 'map';
  $$('[data-sort]').forEach((b) => {
    const on = b.dataset.sort === S.sort;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on);
  });
  const tx = $('#f-texture'), pt = $('#f-pate');
  tx.value = S.texture; pt.value = S.pate;
  tx.classList.toggle('is-on', !!S.texture);
  pt.classList.toggle('is-on', !!S.pate);
}

function miamBtn(f, size = 'sm') {
  const on = !!liked[f.id];
  return `<button type="button" class="mf-btn mf-btn--miam mf-btn--${size} ${on ? 'is-on' : ''}" data-like="${esc(f.id)}" aria-pressed="${on}" aria-label="Miam ! ${f.likes || 0} miams">${HEART}<span>${f.likes || 0}</span></button>`;
}

function imgBlock(f, w, h) {
  return f.photo
    ? `<img class="photo" src="${esc(imgUrl(f.photo, w, h))}" alt="Flan de ${esc(f.boulangerie)}" loading="lazy">`
    : SLICE;
}

function pcard(f, i) {
  const bg = ['#FFE08C', '#FFF1CF', '#FFE7B8'][i] || '#FFF4DC';
  const d = distLabel(f);
  const meta = [f.nom, f.appareil, pateShort(f.pate)].filter(Boolean).map(esc).join(' · ');
  return `
  <article class="mf-card mf-card--hover pcard ${i === 0 && S.sort === 'likes' ? 'is-first' : ''}" data-open="${esc(f.id)}">
    <div class="pcard-img ${f.photo ? 'has-photo' : ''}" style="background:${bg}">
      ${imgBlock(f, 640, 400)}
      <span class="pcard-rank">${i + 1}</span>
      <span class="pcard-price">${esc(prixInfo(f.prix).l)}</span>
      ${!f.photo && photosOn() ? '<span class="pcard-nophoto">Pas encore de photo</span>' : ''}
    </div>
    <div class="pcard-body">
      <h3 class="pcard-name">${esc(f.boulangerie)}</h3>
      <p class="pcard-meta">${meta}</p>
      <p class="pcard-where">${esc(placeLabel(f))}${d ? ` <span>· ${d}</span>` : ''}</p>
      <div class="pcard-actions">
        ${miamBtn(f)}
        <div>
          <button type="button" class="mf-btn mf-btn--ghost mf-btn--sm" data-locate="${esc(f.id)}">Sur la carte</button>
          <a class="mf-btn mf-btn--caramel mf-btn--sm" href="${esc(goUrl(f))}" target="_blank" rel="noopener" data-go>Y aller</a>
        </div>
      </div>
    </div>
  </article>`;
}

function row(f, n, opts = {}) {
  const d = distLabel(f);
  const sub = [placeLabel(f), d, f.appareil].filter(Boolean).map(esc).join(' · ');
  return `
  <div class="row ${opts.on ? 'is-on' : ''}" data-${opts.select ? 'select' : 'open'}="${esc(f.id)}" tabindex="0">
    <span class="row-rank">${n}</span>
    <div class="row-main"><strong>${esc(f.boulangerie)}</strong><span>${sub}</span></div>
    <span class="row-price">${esc(prixInfo(f.prix).l)}</span>
    <span class="row-likes">${HEART}${f.likes || 0}</span>
    ${opts.select ? '' : `<a class="mf-btn mf-btn--caramel mf-btn--sm row-go" href="${esc(goUrl(f))}" target="_blank" rel="noopener" data-go>Y aller</a>`}
  </div>`;
}

function renderList() {
  const list = currentList();
  const where = S.city === 'all' ? 'en France' : `à ${S.city}`;
  const titles = { likes: `Le podium ${where}`, near: 'Les plus proches de toi', price: `Les moins chers ${where}` };
  $('#podium-title').textContent = titles[S.sort] || titles.likes;
  $('#rest-title').textContent = `La suite ${where}`;

  if (!S.loaded) {
    $('#podium').innerHTML = [0, 1, 2].map(() => '<div class="mf-card pcard" style="height:340px;opacity:.5"></div>').join('');
    $('#rest-section').hidden = true;
    return;
  }
  const empty = $('#empty');
  if (!list.length) {
    $('#podium-title').hidden = true;
    $('#podium').innerHTML = '';
    $('#rest-section').hidden = true;
    const filtersOn = S.texture || S.pate || S.query;
    empty.innerHTML = `
      <div class="empty">
        <div style="width:150px;margin:0 auto">${SLICE}</div>
        <h2 class="mf-display">${filtersOn ? 'Aucun flan avec ces critères' : `Pas encore de flan ${where}`}</h2>
        <p>${filtersOn ? 'Essaie avec moins de filtres.' : 'Le premier qui en ajoute un gagne notre respect éternel.'}</p>
        ${filtersOn
          ? '<button type="button" class="mf-btn mf-btn--ink" data-action="reset">Effacer les filtres</button>'
          : '<button type="button" class="mf-btn mf-btn--ink" data-action="add">Ajouter le premier flan</button>'}
      </div>`;
    return;
  }
  empty.innerHTML = '';
  $('#podium-title').hidden = false;
  $('#podium').innerHTML = list.slice(0, 3).map(pcard).join('');
  const rest = list.slice(3);
  $('#rest-section').hidden = !rest.length;
  const shown = S.showAll ? rest : rest.slice(0, PAGE);
  $('#rest').innerHTML = shown.map((f, i) => row(f, i + 4)).join('')
    + (rest.length > PAGE ? `<button type="button" class="more" data-action="more">${S.showAll ? 'Réduire' : `Voir les ${rest.length - PAGE} autres flans`}</button>` : '');
}

/* ---------- Carte ---------- */
let map = null, layer = null, meMarker = null, lastFitKey = '';
function ensureMap() {
  if (map || !window.L) return !!map;
  map = L.map('map', { zoomControl: true, scrollWheelZoom: false, tap: true }).setView(FRANCE, 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © CARTO', maxZoom: 19
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
  map.on('click', () => { S.selId = null; renderMapCard(); highlightMapList(); });
  return true;
}
function pinIcon(n, on, top) {
  const size = on ? 46 : top ? 36 : 30;
  const bg = on ? '#241C17' : top ? '#F29A4A' : '#FFFFFF';
  const fg = on ? '#FFF9EF' : '#241C17';
  return L.divIcon({
    className: '',
    html: `<div class="pin"><span style="width:${size}px;height:${size}px;background:${bg};color:${fg};font-size:${on ? 16 : 14}px">${n}</span><i></i></div>`,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8]
  });
}
function renderMap() {
  const list = currentList();
  $('#map-list').innerHTML = list.length
    ? list.map((f, i) => row(f, i + 1, { select: true, on: f.id === S.selId })).join('')
    : '<div class="empty"><p>Aucun flan à afficher ici.</p></div>';
  if (!ensureMap()) { renderMapCard(); return; }
  setTimeout(() => map.invalidateSize(), 0);
  layer.clearLayers();
  const pts = [];
  list.forEach((f, i) => {
    const p = posOf(f);
    if (!p) return;
    pts.push(p.ll);
    const m = L.marker(p.ll, { icon: pinIcon(i + 1, f.id === S.selId, i < 3), zIndexOffset: f.id === S.selId ? 1000 : -i, keyboard: true, title: f.boulangerie });
    m.on('click', (e) => { L.DomEvent.stopPropagation(e); selectOnMap(f.id, false); });
    layer.addLayer(m);
  });
  if (S.userPos) {
    if (!meMarker) meMarker = L.marker(S.userPos, { icon: L.divIcon({ className: '', html: '<div class="pin-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false });
    meMarker.setLatLng(S.userPos).addTo(map);
  }
  const key = `${S.city}|${S.texture}|${S.pate}|${S.query}|${list.length}`;
  if (key !== lastFitKey && pts.length) {
    lastFitKey = key;
    if (pts.length === 1) map.setView(pts[0], 15);
    else map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 15 });
  } else if (!pts.length && S.city !== 'all') {
    geocodeCity(S.city).then((c) => c && map.setView(c, 12));
  }
  renderMapCard();
}
function renderMapCard() {
  const card = $('#map-card');
  const list = currentList();
  const i = list.findIndex((f) => f.id === S.selId);
  if (i < 0) { card.classList.remove('is-on'); card.innerHTML = ''; return; }
  const f = list[i];
  const d = distLabel(f);
  card.dataset.open = f.id;
  card.innerHTML = `
    <span class="map-card-rank">${i + 1}</span>
    <div class="row-main"><strong>${esc(f.boulangerie)}</strong><span>${[placeLabel(f), d, prixInfo(f.prix).l, `${f.likes || 0} miams`].filter(Boolean).map(esc).join(' · ')}</span></div>
    <a class="mf-btn mf-btn--caramel" href="${esc(goUrl(f))}" target="_blank" rel="noopener" data-go>${ICO_GO}Y aller</a>`;
  card.classList.add('is-on');
}
function highlightMapList() {
  $$('#map-list .row').forEach((r) => r.classList.toggle('is-on', r.dataset.select === S.selId));
}
function selectOnMap(id, fly) {
  S.selId = id;
  renderMap();
  const f = S.flans.find((x) => x.id === id);
  const p = f && posOf(f);
  if (fly && p && map) map.flyTo(p.ll, Math.max(map.getZoom(), 15), { duration: .6 });
  const r = $(`#map-list .row[data-select="${CSS.escape(id)}"]`);
  if (r && window.innerWidth > 640) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* =========================================================================
   Navigation : ville, vue, tri
   ========================================================================= */
function syncUrl() {
  const u = new URL(location.href);
  if (S.city === 'all') u.searchParams.delete('ville'); else u.searchParams.set('ville', S.city);
  u.searchParams.delete('q');
  history.replaceState(null, '', u.pathname + u.search + u.hash);
}
function setCity(name, opts = {}) {
  S.city = name === 'all' ? 'all' : canonCity(name);
  S.showAll = false;
  S.selId = null;
  S.query = '';
  if (!opts.keepSort && S.sort === 'near' && !S.userPos) S.sort = 'likes';
  store.set('mf_city', S.city);
  syncUrl();
  render();
  if (S.city !== 'all') geocodeCity(S.city);
}
function setView(v) {
  S.view = v;
  render();
  if (v === 'map') scrollToViews();
}
function scrollToViews() {
  const target = $(S.view === 'map' ? '#view-map' : '#view-list');
  const top = target.getBoundingClientRect().top + window.scrollY - $('.toolbar').offsetHeight;
  if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: 'smooth' });
}

/* Autour de moi */
function aroundMe() {
  if (!navigator.geolocation) { toast('Ton navigateur ne partage pas la position. Choisis ta ville juste au-dessus.'); return; }
  const btn = $('#btn-near');
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition((pos) => {
    btn.disabled = false;
    S.userPos = [pos.coords.latitude, pos.coords.longitude];
    let best = null, bestD = Infinity;
    visible().forEach((f) => { const d = distOf(f); if (d != null && d < bestD) { bestD = d; best = f; } });
    S.sort = 'near';
    if (best && bestD < NEAR_KM * 1000) {
      setCity(best.ville, { keepSort: true });
      toast('Te voilà ! Voici les flans les plus proches.');
    } else {
      setCity('all', { keepSort: true });
      toast('Pas encore de flan près de toi… Ajoute le premier !');
    }
  }, () => {
    btn.disabled = false;
    if (S.sort === 'near') { S.sort = 'likes'; render(); }
    toast('Position non partagée. Pas grave : choisis ta ville juste au-dessus.');
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

/* =========================================================================
   Recherche avec suggestions
   ========================================================================= */
let sugItems = [], sugIndex = -1;
function highlight(text, q) {
  const t = String(text);
  const i = norm(t).indexOf(norm(q));
  if (!q || i < 0) return esc(t);
  return `${esc(t.slice(0, i))}<mark>${esc(t.slice(i, i + q.length))}</mark>${esc(t.slice(i + q.length))}`;
}
function renderSuggest() {
  const raw = $('#q').value.trim();
  const q = norm(raw);
  const box = $('#suggest');
  if (!q) { box.classList.remove('is-open'); $('#q').setAttribute('aria-expanded', 'false'); sugItems = []; return; }
  const cities = cityList().filter((c) => norm(c.name).includes(q)).slice(0, 4).map((c) => ({ type: 'city', name: c.name, sub: `${c.count} flan${c.count > 1 ? 's' : ''}` }));
  const flans = visible().filter((f) => norm(`${f.boulangerie} ${f.nom}`).includes(q)).sort(byLikes).slice(0, 5)
    .map((f) => ({ type: 'flan', id: f.id, name: f.boulangerie, sub: `${placeLabel(f)} · ${f.likes || 0} miams` }));
  sugItems = [...cities, ...flans];
  if (!cities.length && raw.length >= 3) sugItems.push({ type: 'newcity', name: raw, sub: 'Voir cette ville' });
  sugIndex = -1;
  box.innerHTML = sugItems.map((s, i) => `
    <button type="button" role="option" data-sug="${i}" id="sug-${i}">
      <span class="suggest-ico">${s.type === 'flan' ? ICO_SHOP : ICO_PIN}</span>
      <span><strong>${highlight(s.name, raw)}</strong><span class="sub">${esc(s.sub)}</span></span>
    </button>`).join('');
  box.classList.toggle('is-open', sugItems.length > 0);
  $('#q').setAttribute('aria-expanded', String(sugItems.length > 0));
}
function pickSuggest(i) {
  const s = sugItems[i];
  if (!s) return;
  $('#q').value = '';
  $('#suggest').classList.remove('is-open');
  if (s.type === 'flan') { const f = S.flans.find((x) => x.id === s.id); if (f) { setCity(f.ville); openSheet(f.id); } }
  else setCity(s.name);
}

/* =========================================================================
   Miam (like)
   ========================================================================= */
async function toggleLike(id, btn) {
  const f = S.flans.find((x) => x.id === id);
  if (!f) return;
  const was = !!liked[id];
  if (was) delete liked[id]; else liked[id] = true;
  store.set('mf_liked', liked);
  f.likes = Math.max(0, (f.likes || 0) + (was ? -1 : 1));
  if (btn && !was) {
    const r = btn.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top, 16);
  }
  render();
  if ($('#sheet-bg').classList.contains('is-open') && sheetId === id) renderSheet(f);
  const again = $(`[data-like="${CSS.escape(id)}"]`);
  if (again && !was) { again.classList.add('mf-pop'); }
  try {
    await db.collection('flans').doc(id).update({ likes: firebase.firestore.FieldValue.increment(was ? -1 : 1) });
  } catch (e) { toast('Petit souci de connexion, réessaie.'); }
}

/* =========================================================================
   Fiche d'un flan
   ========================================================================= */
let sheetId = null, lastFocus = null, sheetMode = 'info';
function openSheet(id) {
  const f = S.flans.find((x) => x.id === id);
  if (!f) return;
  sheetId = id;
  sheetMode = 'info';
  lastFocus = document.activeElement;
  renderSheet(f);
  const bg = $('#sheet-bg');
  bg.classList.add('is-open');
  bg.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  history.replaceState(null, '', `${location.pathname}${location.search}#flan-${id}`);
  setTimeout(() => $('#sheet [data-close]')?.focus(), 50);
}
function closeSheet() {
  const bg = $('#sheet-bg');
  if (!bg.classList.contains('is-open')) return;
  bg.classList.remove('is-open');
  bg.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  sheetId = null;
  history.replaceState(null, '', location.pathname + location.search);
  lastFocus?.focus?.();
}
function renderSheet(f) {
  const sh = $('#sheet');
  const rank = cityRank(f);
  const d = distLabel(f);
  if (sheetMode === 'report') {
    sh.innerHTML = `
      <div class="sheet-body">
        <h2 class="mf-display sheet-title" id="sheet-title">Signaler ce flan ?</h2>
        <p class="sheet-sub" style="margin:8px 0 20px">${esc(f.boulangerie)} est fermée, l'info est fausse, ou c'est un faux flan ? On vérifie et on corrige.</p>
        <div class="sheet-actions">
          <button type="button" class="mf-btn mf-btn--ink mf-btn--lg" data-report-confirm="${esc(f.id)}">Oui, signaler</button>
          <button type="button" class="mf-btn mf-btn--ghost mf-btn--lg" data-report-cancel>Annuler</button>
        </div>
      </div>`;
    return;
  }
  sh.innerHTML = `
    <div class="sheet-img">
      ${imgBlock(f, 1040, 460)}
      <button type="button" class="mf-btn mf-btn--icon sheet-close" data-close aria-label="Fermer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      ${rank > 0 ? `<span class="sheet-rank">N°${rank} à ${esc(f.ville)}</span>` : ''}
    </div>
    <div class="sheet-body">
      <h2 class="mf-display sheet-title" id="sheet-title">${esc(f.boulangerie)}</h2>
      <p class="sheet-sub">${[f.nom, f.adresse || placeLabel(f), d].filter(Boolean).map(esc).join(' · ')}</p>
      <div class="sheet-facts">
        <div><small>Prix</small><b>${esc(prixInfo(f.prix).l)}</b></div>
        <div><small>Texture</small><b>${esc(f.appareil || '?')}</b></div>
        <div><small>Pâte</small><b>${esc(pateShort(f.pate) || '?')}</b></div>
      </div>
      ${f.comment ? `<p class="sheet-quote">« ${esc(f.comment)} »</p>` : ''}
      <div class="sheet-actions">
        <a class="mf-btn mf-btn--caramel mf-btn--lg" href="${esc(goUrl(f))}" target="_blank" rel="noopener">${ICO_GO}Y aller${d ? ` · ${d.replace('à ', '')}` : ''}</a>
        ${miamBtn(f, 'lg')}
        <button type="button" class="mf-btn mf-btn--ghost mf-btn--lg" data-share="${esc(f.id)}">Partager</button>
      </div>
      <div class="sheet-links">
        ${photosOn() ? `<button type="button" data-photo="${esc(f.id)}">${f.photo ? 'Ajouter ma photo' : 'Pas encore de photo · Ajoute la tienne'}</button>` : '<span></span>'}
        <button type="button" data-report="${esc(f.id)}">Signaler une erreur</button>
      </div>
    </div>`;
}
async function share(f) {
  const url = f ? `https://meilleurflan.fr/?ville=${encodeURIComponent(f.ville)}#flan-${f.id}` : 'https://meilleurflan.fr';
  const text = f
    ? `${f.boulangerie} (${f.ville}) : ${f.likes || 0} miams sur MeilleurFlan. Tu valides ?`
    : 'Le classement des meilleurs flans pâtissiers de France, voté par la communauté.';
  if (navigator.share) { try { await navigator.share({ title: 'MeilleurFlan.fr', text, url }); } catch (e) { /* annulé */ } return; }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Lien copié !'); } catch (e) { toast(url); }
}

/* =========================================================================
   Photos (Cloudinary + modération)
   ========================================================================= */
async function compressImage(file, max = 1400, quality = .82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', quality));
  } finally { URL.revokeObjectURL(url); }
}
async function uploadPhoto(file, flanId) {
  if (!photosOn()) throw new Error('photos désactivées');
  if (!/^image\//.test(file.type)) throw new Error('pas une image');
  const blob = await compressImage(file);
  const fd = new FormData();
  fd.append('file', blob, 'flan.jpg');
  fd.append('upload_preset', CLOUDINARY.preset);
  fd.append('folder', 'meilleurflan');
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloud}/image/upload`, { method: 'POST', body: fd });
  if (!r.ok) throw new Error('envoi refusé');
  const d = await r.json();
  await db.collection('photos').add({ flanId, url: d.secure_url, publicId: d.public_id, ts: Date.now(), approved: false });
  return d.secure_url;
}
let photoTarget = null;
function askPhoto(flanId) {
  photoTarget = flanId;
  const inp = $('#photo-only');
  inp.value = '';
  inp.click();
}

/* =========================================================================
   Ajouter un flan
   ========================================================================= */
const A = { step: 'where', place: null, known: [], from: 'where', prix: '', appareil: '', pate: '', file: null, busy: false };
let abortCtl = null;

function openAdd() {
  Object.assign(A, { step: 'where', place: null, known: [], from: 'where', prix: '', appareil: '', pate: '', file: null, busy: false });
  $('#bk-q').value = '';
  $('#bk-results').innerHTML = '';
  $('#bk-manual').hidden = true;
  $('#bk-name').value = ''; $('#bk-addr').value = ''; $('#addr-results').innerHTML = '';
  $('#dt-comment').value = ''; $('#dt-name').value = '';
  setPhotoPreview(null);
  $('.add-photo').classList.toggle('is-hidden', !photosOn());
  lastFocus = document.activeElement;
  const bg = $('#add-bg');
  bg.classList.add('is-open');
  bg.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  showStep('where');
  setTimeout(() => $('#bk-q').focus(), 80);
}
function closeAdd() {
  const bg = $('#add-bg');
  bg.classList.remove('is-open');
  bg.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  lastFocus?.focus?.();
}
function showStep(step) {
  A.step = step;
  $$('.add-step').forEach((el) => { el.hidden = el.dataset.step !== step; });
  const dots = $$('#add-dots span');
  dots[0].classList.toggle('is-on', step !== 'done');
  dots[1].classList.toggle('is-on', step === 'details');
  $('#add-dots').style.visibility = step === 'done' ? 'hidden' : 'visible';
  $('#add-back').style.visibility = step === 'done' ? 'hidden' : 'visible';
  if (step === 'details') renderDetails();
  $(`.add-step[data-step="${step}"]`).scrollTop = 0;
}
function addBack() {
  if (A.step === 'where') closeAdd();
  else if (A.step === 'exists') showStep('where');
  else if (A.step === 'details') showStep(A.from);
  else closeAdd();
}

/* Boulangeries déjà présentes sur le site */
function knownPlaces() {
  const groups = new Map();
  S.flans.filter((f) => !f.reported).forEach((f) => {
    const key = f.osmId || `${norm(f.boulangerie)}|${norm(f.ville)}`;
    if (!groups.has(key)) groups.set(key, { known: true, name: f.boulangerie, ville: f.ville, adresse: f.adresse || '', quartier: f.quartier || '', lat: f.lat, lng: f.lng, osmId: f.osmId || '', flans: [] });
    groups.get(key).flans.push(f);
  });
  return Array.from(groups.values());
}
function sameName(a, b) {
  const x = norm(a).replace(/\b(boulangerie|patisserie|maison|la|le|les|de|du|des|l|d|et|chez)\b/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const y = new Set(norm(b).split(/\s+/));
  return x.length ? x.some((w) => y.has(w)) : norm(a) === norm(b);
}
function flansAt(place) {
  return S.flans.filter((f) => {
    if (f.reported) return false;
    if (place.osmId && f.osmId === place.osmId) return true;
    if (typeof f.lat === 'number' && typeof place.lat === 'number') {
      if (haversine([f.lat, f.lng], [place.lat, place.lng]) < 80 && sameName(f.boulangerie, place.name)) return true;
    }
    return norm(f.boulangerie) === norm(place.name) && norm(f.ville) === norm(place.ville);
  });
}

function quartierFrom(city, postcode, district) {
  const pc = String(postcode || '');
  const big = { Paris: '75', Lyon: '69', Marseille: '13' };
  if (big[city] && pc.startsWith(big[city]) && pc.length === 5) {
    const n = parseInt(pc.slice(3), 10);
    if (n >= 1 && n <= 20) return `${city} ${n === 1 ? '1er' : `${n}e`}`;
  }
  return district || '';
}
function photonToPlace(ft) {
  const p = ft.properties || {};
  const [lng, lat] = ft.geometry.coordinates;
  const ville = p.city || p.town || p.village || p.municipality || p.county || '';
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  return {
    known: false,
    name: p.name || street,
    ville,
    adresse: [street, ville].filter(Boolean).join(', '),
    quartier: quartierFrom(ville, p.postcode, p.district),
    lat, lng,
    osmId: p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : ''
  };
}
const SHOPISH = new Set(['shop', 'amenity', 'craft', 'tourism']);
async function photon(params) {
  if (abortCtl) abortCtl.abort();
  abortCtl = new AbortController();
  const r = await fetch(`https://photon.komoot.io/api/?${new URLSearchParams({ lang: 'fr', limit: '12', ...params })}`, { signal: abortCtl.signal });
  if (!r.ok) throw new Error('photon');
  const d = await r.json();
  return (d.features || []).filter((f) => (f.properties || {}).countrycode === 'FR' && SHOPISH.has(f.properties.osm_key) && f.properties.name).map(photonToPlace);
}
function biasPoint() {
  if (S.userPos) return S.userPos;
  return S.city !== 'all' ? cityCoords(S.city) : null;
}
function mergeResults(local, remote) {
  const out = [...local];
  remote.forEach((p) => {
    const dup = out.find((k) => (k.osmId && k.osmId === p.osmId)
      || (typeof k.lat === 'number' && haversine([k.lat, k.lng], [p.lat, p.lng]) < 80 && sameName(k.name, p.name))
      || (norm(k.name) === norm(p.name) && norm(k.ville) === norm(p.ville)));
    if (dup) { if (!dup.osmId) Object.assign(dup, { lat: p.lat, lng: p.lng, adresse: dup.adresse || p.adresse, quartier: dup.quartier || p.quartier, osmId: p.osmId }); }
    else out.push(p);
  });
  return out;
}
let resultCache = [];
function renderResults(target, list, q) {
  resultCache = list;
  target.innerHTML = list.slice(0, 8).map((p, i) => `
    <button type="button" class="add-result ${p.known ? 'is-known' : ''}" data-place="${i}">
      <span class="add-result-ico">${ICO_SHOP}</span>
      <span class="add-result-main"><strong>${highlight(p.name, q || '')}</strong><span>${esc(p.adresse || p.ville)}${p.dist != null ? ` · ${fmtDist(p.dist)}` : ''}</span></span>
      ${p.known ? '<span class="add-badge">Déjà sur le site</span>' : ''}
    </button>`).join('');
}
const searchBakery = debounce(async () => {
  const raw = $('#bk-q').value.trim();
  const box = $('#bk-results');
  if (raw.length < 2) { box.innerHTML = ''; return; }
  const q = norm(raw);
  const local = knownPlaces().filter((k) => norm(k.name).includes(q));
  renderResults(box, local, raw);
  if (!local.length) box.innerHTML = '<div class="add-status">Recherche…</div>';
  try {
    const b = biasPoint();
    const remote = await photon({ q: raw, ...(b ? { lat: b[0], lon: b[1] } : {}) });
    const list = mergeResults(local, remote);
    if (list.length) renderResults(box, list, raw);
    else box.innerHTML = '<div class="add-status">Aucune boulangerie trouvée. Vérifie le nom ou entre l\'adresse ci-dessous.</div>';
  } catch (e) {
    if (e.name === 'AbortError') return;
    if (!local.length) box.innerHTML = '<div class="add-status">La recherche ne répond pas. Entre l\'adresse à la main ci-dessous.</div>';
  }
}, 280);

function bakeryHere() {
  if (!navigator.geolocation) { toast('Position indisponible : tape le nom de la boulangerie.'); return; }
  const box = $('#bk-results');
  box.innerHTML = '<div class="add-status">On cherche autour de toi…</div>';
  navigator.geolocation.getCurrentPosition(async (pos) => {
    S.userPos = [pos.coords.latitude, pos.coords.longitude];
    const near = (p) => typeof p.lat === 'number' && (p.dist = haversine(S.userPos, [p.lat, p.lng])) < 300;
    const local = knownPlaces().filter(near);
    let remote = [];
    try { remote = (await photon({ q: 'boulangerie', lat: S.userPos[0], lon: S.userPos[1], limit: '20' })).filter(near); } catch (e) { /* hors ligne */ }
    const list = mergeResults(local, remote).sort((a, b) => a.dist - b.dist);
    if (list.length) renderResults(box, list, '');
    else box.innerHTML = '<div class="add-status">Aucune boulangerie trouvée à moins de 300 m. Tape son nom ou entre l\'adresse.</div>';
  }, () => { box.innerHTML = '<div class="add-status">Position non partagée. Tape le nom de la boulangerie.</div>'; }, { enableHighAccuracy: true, timeout: 10000 });
}

/* Adresse à la main (API Adresse de l'IGN) */
let addrCache = [];
const searchAddress = debounce(async () => {
  const q = $('#bk-addr').value.trim();
  const box = $('#addr-results');
  if (q.length < 4) { box.innerHTML = ''; return; }
  try {
    const r = await fetch(`https://data.geopf.fr/geocodage/search?${new URLSearchParams({ q, index: 'address', autocomplete: '1', limit: '5' })}`);
    const d = await r.json();
    addrCache = (d.features || []).map((ft) => {
      const p = ft.properties || {};
      const [lng, lat] = ft.geometry.coordinates;
      const ville = p.city || '';
      return { label: p.label || q, ville, adresse: [p.name, ville].filter(Boolean).join(', '), quartier: quartierFrom(ville, p.postcode, p.district), lat, lng };
    });
    box.innerHTML = addrCache.map((a, i) => `
      <button type="button" class="add-result" data-addr="${i}">
        <span class="add-result-ico">${ICO_PIN}</span>
        <span class="add-result-main"><strong>${esc(a.label)}</strong></span>
      </button>`).join('');
  } catch (e) { box.innerHTML = '<div class="add-status">Adresse introuvable pour le moment, réessaie.</div>'; }
}, 280);

function choosePlace(place) {
  A.place = place;
  const here = flansAt(place);
  if (here.length) {
    A.known = here;
    $('#ex-title').textContent = `${place.name} est déjà sur MeilleurFlan`;
    $('#ex-list').innerHTML = here.map((f) => `
      <div class="add-excard">
        <div class="add-excard-head">
          <div class="add-excard-thumb">${f.photo ? `<img src="${esc(imgUrl(f.photo, 120, 120))}" alt="">` : SLICE}</div>
          <div><strong>${esc(f.nom || 'Flan pâtissier')}</strong><small>${f.approved === false ? 'En attente de validation' : `${esc(prixInfo(f.prix).l)} · ${f.likes || 0} miams`}</small></div>
        </div>
        ${f.approved === false ? '' : `
        <div class="add-excard-actions">
          <button type="button" class="mf-btn mf-btn--miam" data-ex-miam="${esc(f.id)}">${HEART}${liked[f.id] ? 'Déjà miamé' : 'Miam !'}</button>
          ${photosOn() ? `<button type="button" class="mf-btn mf-btn--ghost" data-ex-photo="${esc(f.id)}">Ma photo</button>` : ''}
        </div>`}
      </div>`).join('');
    $('#ex-other').textContent = `Ajouter un autre flan de ${place.name}`;
    showStep('exists');
  } else {
    A.from = 'where';
    showStep('details');
  }
}

function setPhotoPreview(file) {
  A.file = file;
  const img = $('#dt-photo-preview');
  const empty = $('.add-photo-empty');
  if (file) { img.src = URL.createObjectURL(file); img.hidden = false; empty.hidden = true; }
  else { img.removeAttribute('src'); img.hidden = true; empty.hidden = false; }
}

function renderDetails() {
  const p = A.place;
  $('#dt-place').innerHTML = p ? `<strong>${esc(p.name)}</strong> · ${esc(p.quartier || p.ville || p.adresse)}` : '';
  const chip = (group, v, label, hint) => {
    const on = A[group] === v;
    return hint
      ? `<button type="button" class="add-opt" data-opt="${group}" data-v="${esc(v)}" aria-pressed="${on}"><strong>${esc(label)}</strong><span>${esc(hint)}</span></button>`
      : `<button type="button" class="mf-chip" data-opt="${group}" data-v="${esc(v)}" aria-pressed="${on}">${esc(label)}</button>`;
  };
  $('[data-group="prix"]').innerHTML = PRIX.map((x) => chip('prix', x.v, x.l)).join('');
  $('[data-group="appareil"]').innerHTML = TEXTURES.map((x) => chip('appareil', x.v, x.v, x.h)).join('');
  $('[data-group="pate"]').innerHTML = PATES.map((x) => chip('pate', x.v, x.l, x.h)).join('');
  updatePublish();
}
function updatePublish() {
  const btn = $('#dt-publish');
  const ready = A.prix && A.appareil && A.pate;
  const missing = [!A.prix && 'prix', !A.appareil && 'texture', !A.pate && 'pâte'].filter(Boolean);
  btn.disabled = !ready || A.busy;
  btn.textContent = A.busy ? 'Envoi en cours…' : ready ? 'Publier mon flan' : `Choisis ${missing.join(', ').replace(/, ([^,]*)$/, ' et $1')}`;
}

function monthYear() {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
function clean(o) { Object.keys(o).forEach((k) => (o[k] === undefined || o[k] === null || o[k] === '') && delete o[k]); return o; }

async function publish() {
  if (A.busy || !A.place) return;
  const comment = $('#dt-comment').value.trim();
  const name = $('#dt-name').value.trim();
  if (![comment, name, A.place.name].every(contentOk)) { toast('Un mot ne passe pas notre filtre anti-bêtises. Tu peux corriger ?'); return; }
  A.busy = true; updatePublish();
  const doc = clean({
    nom: name || 'Flan pâtissier',
    boulangerie: A.place.name,
    ville: A.place.ville,
    adresse: A.place.adresse,
    quartier: A.place.quartier,
    lat: typeof A.place.lat === 'number' ? A.place.lat : undefined,
    lng: typeof A.place.lng === 'number' ? A.place.lng : undefined,
    osmId: A.place.osmId,
    prix: A.prix,
    appareil: A.appareil,
    pate: A.pate,
    comment,
    date: monthYear(),
    ts: Date.now()
  });
  Object.assign(doc, { likes: 0, reported: false, beenCount: 0, approved: false });
  try {
    const ref = await db.collection('flans').add(doc);
    let photoMsg = '';
    if (A.file && photosOn()) {
      try { await uploadPhoto(A.file, ref.id); } catch (e) { photoMsg = ' La photo n\'est pas passée, tu pourras la rajouter plus tard.'; }
    }
    if (doc.ville) geocodeCity(doc.ville);
    done('Merci, ton flan est en route !', `On le vérifie vite fait, il apparaît sur le site sous 24 h.${photoMsg}`);
  } catch (e) {
    toast('L\'envoi n\'a pas marché. Vérifie ta connexion et réessaie.');
  } finally {
    A.busy = false; updatePublish();
  }
}
function done(title, text) {
  $('#done-title').textContent = title;
  $('#done-text').textContent = text;
  showStep('done');
  const r = $('.add-done-art').getBoundingClientRect();
  confetti(r.left + r.width / 2, r.top + 40, 36);
}

/* =========================================================================
   Événements
   ========================================================================= */
document.addEventListener('click', (e) => {
  const t = e.target;
  const like = t.closest('[data-like]');
  if (like) { e.preventDefault(); e.stopPropagation(); toggleLike(like.dataset.like, like); return; }
  if (t.closest('[data-go]')) { e.stopPropagation(); return; }
  const loc = t.closest('[data-locate]');
  if (loc) { e.stopPropagation(); S.view = 'map'; S.selId = loc.dataset.locate; render(); selectOnMap(loc.dataset.locate, true); scrollToViews(); return; }
  const act = t.closest('[data-action]');
  if (act) {
    const a = act.dataset.action;
    if (a === 'add') openAdd();
    if (a === 'more') { S.showAll = !S.showAll; renderList(); }
    if (a === 'reset') { S.texture = ''; S.pate = ''; S.query = ''; render(); }
    return;
  }
  const city = t.closest('[data-city]');
  if (city) { setCity(city.dataset.city); return; }
  const sort = t.closest('[data-sort]');
  if (sort) {
    const v = sort.dataset.sort;
    if (v === 'near' && !S.userPos) { aroundMe(); return; }
    S.sort = v; S.showAll = false; render(); return;
  }
  const sel = t.closest('[data-select]');
  if (sel) { selectOnMap(sel.dataset.select, true); return; }
  const open = t.closest('[data-open]');
  if (open) { e.preventDefault(); openSheet(open.dataset.open); return; }
  const sug = t.closest('[data-sug]');
  if (sug) { pickSuggest(+sug.dataset.sug); return; }
  if (!t.closest('.hero-search')) $('#suggest').classList.remove('is-open');

  /* Fiche */
  if (t.closest('[data-close]') || t.id === 'sheet-bg') { closeSheet(); return; }
  const sh = t.closest('[data-share]');
  if (sh) { share(S.flans.find((x) => x.id === sh.dataset.share)); return; }
  const ph = t.closest('[data-photo]');
  if (ph) { askPhoto(ph.dataset.photo); return; }
  const rep = t.closest('[data-report]');
  if (rep) { sheetMode = 'report'; renderSheet(S.flans.find((x) => x.id === rep.dataset.report)); return; }
  if (t.closest('[data-report-cancel]')) { sheetMode = 'info'; renderSheet(S.flans.find((x) => x.id === sheetId)); return; }
  const repOk = t.closest('[data-report-confirm]');
  if (repOk) {
    db.collection('flans').doc(repOk.dataset.reportConfirm).update({ reported: true }).catch(() => {});
    closeSheet();
    toast('Merci ! On vérifie ça très vite.');
    return;
  }

  /* Ajout */
  if (t.id === 'add-bg') { closeAdd(); return; }
  const place = t.closest('[data-place]');
  if (place) { choosePlace(resultCache[+place.dataset.place]); return; }
  const addr = t.closest('[data-addr]');
  if (addr) {
    const a = addrCache[+addr.dataset.addr];
    const name = $('#bk-name').value.trim();
    if (!name) { toast('Donne d\'abord le nom de la boulangerie.'); $('#bk-name').focus(); return; }
    choosePlace({ known: false, name, ville: a.ville, adresse: a.adresse, quartier: a.quartier, lat: a.lat, lng: a.lng, osmId: '' });
    return;
  }
  const opt = t.closest('[data-opt]');
  if (opt) { A[opt.dataset.opt] = opt.dataset.v; renderDetails(); return; }
  const exMiam = t.closest('[data-ex-miam]');
  if (exMiam) {
    const id = exMiam.dataset.exMiam;
    if (!liked[id]) toggleLike(id);
    done('Miam enregistré !', `${A.place.name} prend un point de plus au classement. Tu viens de faire avancer la science.`);
    return;
  }
  const exPhoto = t.closest('[data-ex-photo]');
  if (exPhoto) { askPhoto(exPhoto.dataset.exPhoto); return; }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('#add-bg').classList.contains('is-open')) closeAdd();
    else if ($('#sheet-bg').classList.contains('is-open')) closeSheet();
    else $('#suggest').classList.remove('is-open');
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.row[tabindex], .map-card')) {
    e.preventDefault();
    e.target.click();
  }
});

$('#tab-list').addEventListener('click', () => setView('list'));
$('#tab-map').addEventListener('click', () => setView('map'));
$('#btn-near').addEventListener('click', aroundMe);
$('#map-locate').addEventListener('click', aroundMe);
$('#f-texture').addEventListener('change', (e) => { S.texture = e.target.value; S.showAll = false; render(); });
$('#f-pate').addEventListener('change', (e) => { S.pate = e.target.value; S.showAll = false; render(); });
$('#city-chips').addEventListener('change', (e) => { if (e.target.id === 'other-cities' && e.target.value) setCity(e.target.value); });

const q = $('#q');
q.addEventListener('input', debounce(renderSuggest, 120));
q.addEventListener('focus', renderSuggest);
q.addEventListener('keydown', (e) => {
  if (!sugItems.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    sugIndex = (sugIndex + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length) % sugItems.length;
    $$('#suggest [data-sug]').forEach((b, i) => b.classList.toggle('is-active', i === sugIndex));
    q.setAttribute('aria-activedescendant', `sug-${sugIndex}`);
  }
});
$('#search-form').addEventListener('submit', (e) => { e.preventDefault(); pickSuggest(Math.max(0, sugIndex)); });

$('#add-back').addEventListener('click', addBack);
$('#add-close').addEventListener('click', closeAdd);
$('#bk-q').addEventListener('input', searchBakery);
$('#bk-here').addEventListener('click', bakeryHere);
$('#bk-manual-open').addEventListener('click', () => { $('#bk-manual').hidden = false; $('#bk-name').value = $('#bk-q').value.trim(); $('#bk-addr').focus(); });
$('#bk-addr').addEventListener('input', searchAddress);
$('#ex-other').addEventListener('click', () => { A.from = 'exists'; showStep('details'); });
$('#dt-change').addEventListener('click', () => showStep('where'));
$('#dt-publish').addEventListener('click', publish);
$('#dt-photo').addEventListener('change', (e) => setPhotoPreview(e.target.files[0] || null));
$('#done-close').addEventListener('click', closeAdd);
$('#done-share').addEventListener('click', () => share(null));

$('#photo-only').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !photoTarget) return;
  toast('Envoi de ta photo…');
  try {
    await uploadPhoto(file, photoTarget);
    if ($('#add-bg').classList.contains('is-open')) done('Photo envoyée !', 'Merci ! Elle apparaîtra sur la fiche dès qu\'on l\'aura validée.');
    else toast('Photo envoyée ! Elle apparaîtra après validation.');
  } catch (err) { toast('La photo n\'est pas passée. Réessaie avec une autre image.'); }
  photoTarget = null;
});

/* =========================================================================
   Démarrage
   ========================================================================= */
$$('[data-slice="hero"]').forEach((el) => { el.innerHTML = SLICE_HERO; });
$$('[data-slice="done"]').forEach((el) => { el.innerHTML = SLICE; });

const params = new URLSearchParams(location.search);
const startCity = params.get('ville') || store.get('mf_city', 'all') || 'all';
S.city = startCity;
const startQuery = params.get('q');

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

render();
let firstLoad = true;
db.collection('flans').onSnapshot((snap) => {
  S.flans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  S.loaded = true;
  if (firstLoad) {
    firstLoad = false;
    if (S.city !== 'all') {
      const exists = cityList().some((c) => norm(c.name) === norm(S.city));
      S.city = exists || params.get('ville') ? canonCity(S.city) : 'all';
    }
    if (startQuery) {
      const c = cityList().find((x) => norm(x.name) === norm(startQuery));
      if (c) S.city = c.name; else S.query = startQuery;
    }
    syncUrl();
    const m = location.hash.match(/^#flan-(.+)$/);
    render();
    if (m) openSheet(decodeURIComponent(m[1]));
    return;
  }
  render();
  if (sheetId) { const f = S.flans.find((x) => x.id === sheetId); if (f && sheetMode === 'info') renderSheet(f); }
}, () => {
  S.loaded = true;
  render();
  toast('Impossible de charger les flans pour le moment. Recharge la page.');
});
})();
