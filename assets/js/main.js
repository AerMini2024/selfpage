const spineSvg = document.querySelector('.spine');
const spinePath = document.querySelector('.spine-path');
const topbar = document.querySelector('.topbar');
const island = document.querySelector('.island');
const logo = document.querySelector('.logo');
const sideNavL = document.querySelector('.side-nav.left');
const sideNavR = document.querySelector('.side-nav.right');
const heroGo = document.querySelector('.hero-go');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const pen = document.createElement('div');
pen.className = 'pen';
document.body.appendChild(pen);

let pathLen = 0;
let samples = [];
let curLen = 0;
let drifters = [];
let islandShrunk = false;

function pageHeight() {
  return Math.round(document.querySelector('main').getBoundingClientRect().height);
}

function columnOffset(vw) {
  const half = Math.min(680, vw - 48) / 2;
  return half + Math.min(90, vw * 0.08);
}

function buildSpine() {
  const vw = innerWidth;
  const vh = pageHeight();
  spineSvg.setAttribute('width', vw);
  spineSvg.setAttribute('height', vh);
  spineSvg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);

  const anchors = Array.from(document.querySelectorAll('[data-spine]'));
  if (anchors.length < 2) return;

  const amp = columnOffset(vw);
  const pts = anchors.map(function (el) {
    const r = el.getBoundingClientRect();
    const side = parseFloat(el.dataset.spine) || 0;
    const x = vw / 2 + side * amp;
    const y = r.top + scrollY;
    return { x: Math.max(24, Math.min(vw - 24, x)), y: y };
  });

  let d = 'M ' + pts[0].x + ' ' + pts[0].y;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ' C ' + c1x + ' ' + c1y + ', ' + c2x + ' ' + c2y + ', ' + p2.x + ' ' + p2.y;
  }
  spinePath.setAttribute('d', d);
  pathLen = spinePath.getTotalLength();
  spinePath.style.strokeDasharray = pathLen + ' ' + pathLen;

  samples = [];
  const n = 240;
  for (let i = 0; i <= n; i++) {
    const len = pathLen * i / n;
    const pt = spinePath.getPointAtLength(len);
    samples.push({ y: pt.y, len: len });
  }

  curLen = Math.min(curLen, pathLen);
}

function lenFromY(y) {
  if (!samples.length) return 0;
  if (y <= samples[0].y) return 0;
  if (y >= samples[samples.length - 1].y) return pathLen;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].y < y) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const t = (y - a.y) / (b.y - a.y || 1);
  return a.len + (b.len - a.len) * t;
}

function measureDrift() {
  drifters = Array.from(document.querySelectorAll('[data-drift]')).map(function (el) {
    const r = el.getBoundingClientRect();
    return { el: el, k: parseFloat(el.dataset.drift) || 0.06, center: r.top + scrollY + r.height / 2 };
  });
}

function isMobileLayout() {
  return matchMedia('(max-width: 720px)').matches;
}

function shrinkIsland() {
  const cs = getComputedStyle(island);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  let w;
  if (isMobileLayout()) {
    w = logo.offsetWidth;
  } else {
    const gap = parseFloat(cs.columnGap) || 0;
    w = logo.offsetWidth + sideNavL.scrollWidth + sideNavR.scrollWidth + gap * 2;
  }
  island.style.width = Math.ceil(w + padX + 4) + 'px';
}

function updateIsland() {
  const s = scrollY > innerHeight * 0.6;
  if (s === islandShrunk) return;
  islandShrunk = s;
  if (topbar) topbar.classList.toggle('is-shrunk', s);
  if (!island) return;
  if (s) shrinkIsland();
  else island.style.width = '';
}

function tick() {
  const targetLen = lenFromY(scrollY + innerHeight * 0.58);
  curLen += (targetLen - curLen) * (reduceMotion ? 1 : 0.11);
  if (Math.abs(targetLen - curLen) < 0.3) curLen = targetLen;
  spinePath.style.strokeDashoffset = pathLen - curLen;

  const pt = spinePath.getPointAtLength(curLen);
  pen.style.transform = 'translate(' + (pt.x - 5) + 'px, ' + (pt.y - 5) + 'px)';

  const vc = scrollY + innerHeight / 2;
  for (const d of drifters) {
    d.el.style.transform = 'translateY(' + (d.center - vc) * -d.k + 'px)';
  }

  if (topbar) updateIsland();
  if (heroGo) heroGo.classList.toggle('is-out', scrollY > 90);

  requestAnimationFrame(tick);
}

const io = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (e.isIntersecting) {
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll('[data-reveal]').forEach(function (el) {
  if (reduceMotion) el.classList.add('is-in');
  else io.observe(el);
});

buildSpine();
measureDrift();

if (reduceMotion) curLen = lenFromY(scrollY + innerHeight * 0.58);
requestAnimationFrame(tick);

let resizeTimer;
addEventListener('resize', function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    buildSpine();
    measureDrift();
    if (islandShrunk) shrinkIsland();
  }, 160);
});

new ResizeObserver(function () {
  buildSpine();
  measureDrift();
  if (islandShrunk) shrinkIsland();
  curLen = lenFromY(scrollY + innerHeight * 0.58);
}).observe(document.body);
