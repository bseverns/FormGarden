(() => {
  'use strict';

  const PARAMS = [
    { key: 'steps', label: 'Steps per stem', value: 110, min: 8, max: 220, step: 1, group: 'grow' },
    { key: 'stems', label: 'Starting stems', value: 5, min: 1, max: 12, step: 1, group: 'emit' },
    { key: 'sides', label: 'Elements around ring', value: 9, min: 3, max: 18, step: 1, group: 'emit' },
    { key: 'radius', label: 'Ring radius', value: 13, min: 0, max: 40, step: .25, group: 'emit' },
    { key: 'advance', label: 'Advance per step', value: 2.6, min: .3, max: 8, step: .05, group: 'grow' },
    { key: 'twist', label: 'Ring twist / step', value: 8, min: -35, max: 35, step: .25, unit: '°', group: 'turn' },
    { key: 'bend', label: 'Bend / step', value: .8, min: -6, max: 6, step: .05, unit: '°', group: 'turn' },
    { key: 'precession', label: 'Bend axis turn', value: .25, min: -8, max: 8, step: .05, unit: '°', group: 'turn', advanced: true },
    { key: 'taper', label: 'Scale / step', value: .988, min: .97, max: 1.01, step: .0005, group: 'grow' },
    { key: 'width', label: 'Element width', value: 3.4, min: .5, max: 14, step: .1, group: 'emit', advanced: true },
    { key: 'depth', label: 'Element depth', value: 2.2, min: .5, max: 14, step: .1, group: 'emit', advanced: true },
    { key: 'length', label: 'Element length', value: 5, min: .5, max: 18, step: .1, group: 'emit', advanced: true },
    { key: 'forkEvery', label: 'Fork every N steps', value: 38, min: 12, max: 100, step: 1, group: 'branch' },
    { key: 'levels', label: 'Branch generations', value: 2, min: 0, max: 3, step: 1, group: 'branch' },
    { key: 'spread', label: 'Branch spread', value: 32, min: 0, max: 85, step: 1, unit: '°', group: 'branch' },
    { key: 'childScale', label: 'Child scale', value: .66, min: .3, max: .95, step: .01, group: 'branch', advanced: true },
    { key: 'jitter', label: 'Angular variation', value: .35, min: 0, max: 4, step: .05, unit: '°', group: 'turn', advanced: true },
    { key: 'budget', label: 'Preview element cap', value: 6000, min: 1000, max: 10000, step: 500, group: 'grow', advanced: true },
    { key: 'exportMM', label: 'Export longest side', value: 180, min: 30, max: 400, step: 5, unit: ' mm', group: 'grow', advanced: true }
  ];

  const PRESETS = [
    { name: 'Curling grove', motif: 0, values: {} },
    { name: 'Open swirl', motif: 0, values: { stems: 3, steps: 155, radius: 10, advance: 3.5, twist: 13, bend: 2.2, precession: .4, taper: 1.003, levels: 1, forkEvery: 55, spread: 58, jitter: .1 } },
    { name: 'Arc cluster', motif: 0, values: { stems: 7, steps: 100, sides: 5, radius: 5, advance: 2.7, twist: 3, bend: 2.5, precession: 0, taper: .997, width: 6, depth: 3, length: 6, levels: 0, jitter: 0 } },
    { name: 'Triangle tower', motif: 2, values: { stems: 1, steps: 24, sides: 3, radius: 22, advance: 8, twist: 4.8, bend: .18, precession: .2, taper: .994, width: 2.4, depth: 2.4, levels: 0, jitter: 0 } }
  ];
  const MOTIFS = ['Blocks', 'Wedges', 'Frame'];
  const GROUPS = [
    { key: 'emit', number: '01', title: 'EMIT', help: 'What is repeated?' },
    { key: 'turn', number: '02', title: 'TURN', help: 'How does direction change?' },
    { key: 'grow', number: '03', title: 'GROW', help: 'How does it accumulate?' },
    { key: 'branch', number: '04', title: 'BRANCH', help: 'When does it divide?' }
  ];
  const LESSONS = [
    { title: 'Change one thing.', body: 'Keep every setting steady except <strong>bend</strong>. Predict the effect, test it, then record what surprised you.', focus: 'bend', prompt: 'What will happen when bend increases?' },
    { title: 'Find a threshold.', body: 'Move <strong>scale per step</strong> slowly across 1.000. Look for the moment taper becomes expansion.', focus: 'taper', prompt: 'Where does the form stop shrinking and begin to expand?' },
    { title: 'Read the rhythm.', body: 'Change <strong>fork interval</strong>. Count the visible moments when one path becomes two.', focus: 'forkEvery', prompt: 'How will a shorter interval change density and hierarchy?' },
    { title: 'Write the rule.', body: 'Save two contrasting iterations, compare them, then explain the smallest rule change that produced the largest visual effect.', focus: 'compare', prompt: 'Which single rule has the greatest visual leverage—and why?' }
  ];
  const PROMPTS = [
    'What will happen when bend increases?',
    'Which setting controls rhythm more than shape?',
    'What must stay constant for this to be a fair comparison?',
    'Where do you see repetition becoming variation?',
    'Which change would make the form feel more architectural?',
    'What rule could produce the opposite silhouette?'
  ];
  const BASE_VALUES = Object.fromEntries(PARAMS.map(p => [p.key, p.value]));

  const state = {
    values: { ...BASE_VALUES }, preset: 0, motif: 0, seed: 4721,
    yaw: .55, pitch: .38, zoom: 1, panX: 0, panY: 0,
    lesson: 0, mode: 'guided', iterations: [], selected: [],
    projectName: 'How does repetition become form?',
    prediction: '', observation: ''
  };
  const undoStack = [], redoStack = [];
  let elements = [], bounds = null, renderQueued = false, drag = null, inputStart = null;
  let toastTimer = null;

  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const canvas = $('#gardenCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  function cloneCore() {
    return { values: { ...state.values }, preset: state.preset, motif: state.motif, seed: state.seed };
  }
  function sameCore(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function pushUndo(previous) {
    if (!previous || sameCore(previous, cloneCore())) return;
    undoStack.push(previous); if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0; updateUndoButtons();
  }
  function restoreCore(core, addHistory = true) {
    if (addHistory) pushUndo(cloneCore());
    state.values = { ...BASE_VALUES, ...core.values };
    state.preset = Number.isInteger(core.preset) ? core.preset : 0;
    state.motif = Math.max(0, Math.min(2, Number(core.motif) || 0));
    state.seed = Number(core.seed) || 4721;
    syncControls(); build(); saveLocal();
  }
  function updateUndoButtons() { $('#undoBtn').disabled = !undoStack.length; $('#redoBtn').disabled = !redoStack.length; }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(cloneCore()); restoreCore(undoStack.pop(), false); updateUndoButtons(); toast('Previous rule set restored');
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(cloneCore()); restoreCore(redoStack.pop(), false); updateUndoButtons(); toast('Rule set restored');
  }

  function renderPresets() {
    $('#presetRow').innerHTML = PRESETS.map((p, i) => `<button class="preset-button${i === state.preset ? ' active' : ''}" data-preset="${i}"><span>0${i + 1}</span> ${p.name}</button>`).join('');
  }

  function renderControls() {
    const normal = GROUPS.map(group => {
      const controls = PARAMS.filter(p => p.group === group.key && !p.advanced).map(controlHTML).join('');
      return `<section class="control-group" data-group="${group.key}"><div class="control-group-title"><b>${group.number}</b><span>${group.title}</span><small>${group.help}</small></div>${controls}</section>`;
    }).join('');
    const advanced = PARAMS.filter(p => p.advanced).map(controlHTML).join('');
    $('#controls').innerHTML = normal + `<details class="advanced"><summary>Advanced rules</summary>${advanced}</details>`;
    syncControls();
  }
  function controlHTML(p) {
    return `<div class="control" data-key="${p.key}"><div class="control-row"><label for="param-${p.key}">${p.label}</label><output for="param-${p.key}"></output></div><input id="param-${p.key}" type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}" aria-label="${p.label}"></div>`;
  }
  function formatValue(p, value) {
    const decimals = p.key === 'taper' ? 4 : p.step < .1 ? 2 : p.step < 1 ? 1 : 0;
    return Number(value).toFixed(decimals) + (p.unit || '');
  }
  function syncControls() {
    PARAMS.forEach(p => {
      const input = $(`#param-${p.key}`); if (!input) return;
      input.value = state.values[p.key];
      input.style.setProperty('--pct', `${((state.values[p.key] - p.min) / (p.max - p.min)) * 100}%`);
      input.closest('.control').querySelector('output').textContent = formatValue(p, state.values[p.key]);
    });
    renderPresets();
    $('#motifBtn').textContent = `Motif · ${MOTIFS[state.motif]}`;
  }

  function setPreset(index) {
    const before = cloneCore();
    state.values = { ...BASE_VALUES, ...PRESETS[index].values };
    state.preset = index; state.motif = PRESETS[index].motif;
    resetView(false); pushUndo(before); syncControls(); build(); saveLocal();
    toast(`${PRESETS[index].name} loaded`);
  }

  function renderLesson() {
    const lesson = LESSONS[state.lesson];
    $('#lessonProgress').textContent = `${state.lesson + 1} / ${LESSONS.length}`;
    $('#lessonTitle').textContent = lesson.title;
    $('#lessonBody').innerHTML = lesson.body;
    $('#promptLabel').textContent = lesson.prompt;
    $('#lessonSteps').innerHTML = LESSONS.map((_, i) => `<button class="lesson-step${i === state.lesson ? ' active' : ''}" data-lesson="${i}" aria-label="Lesson step ${i + 1}" aria-current="${i === state.lesson ? 'step' : 'false'}"></button>`).join('');
    $$('.control').forEach(el => el.style.background = '');
    if (lesson.focus !== 'compare') {
      const focus = $(`.control[data-key="${lesson.focus}"]`);
      if (focus) focus.style.background = 'linear-gradient(90deg, rgba(215,237,102,.25), transparent)';
    }
  }

  function setMode(mode) {
    state.mode = mode;
    $$('.mode-switch button').forEach(btn => {
      const active = btn.dataset.mode === mode; btn.classList.toggle('active', active); btn.setAttribute('aria-selected', String(active));
    });
    $('#guidedContent').hidden = mode !== 'guided';
    $('.teaching-note').hidden = mode !== 'guided';
    saveLocal();
  }

  // Small vector and frame helpers keep the browser port dependency-free.
  const V = {
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    mul: (a, n) => ({ x: a.x * n, y: a.y * n, z: a.z * n }),
    dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    norm(a) { const m = Math.hypot(a.x, a.y, a.z) || 1; return this.mul(a, 1 / m); }
  };
  const RAD = Math.PI / 180;
  function rotate(v, axis, angle) {
    const c = Math.cos(angle), s = Math.sin(angle), d = V.dot(axis, v);
    return V.add(V.add(V.mul(v, c), V.mul(V.cross(axis, v), s)), V.mul(axis, d * (1 - c)));
  }
  function copyFrame(f) { return { p: { ...f.p }, x: { ...f.x }, y: { ...f.y }, z: { ...f.z } }; }
  function rotateFrame(f, localAxis, angle) {
    if (!angle) return;
    const axis = { ...f[localAxis] };
    ['x', 'y', 'z'].forEach(k => { if (k !== localAxis) f[k] = V.norm(rotate(f[k], axis, angle)); });
  }
  function rng(seed) {
    let n = seed >>> 0;
    return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function baseFrame(angle, spread) {
    const f = { p: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } };
    rotateFrame(f, 'z', angle); if (state.values.stems > 1) rotateFrame(f, 'y', spread * .42 * RAD); return f;
  }
  function advanceFrame(frame, size, jx, jy) {
    const f = copyFrame(frame);
    f.p = V.add(f.p, V.mul(f.z, state.values.advance * size));
    rotateFrame(f, 'z', state.values.precession * RAD);
    rotateFrame(f, 'x', (state.values.bend + jx) * RAD);
    rotateFrame(f, 'y', jy * RAD);
    return f;
  }
  function ringPoint(frame, radius, angle) {
    return V.add(frame.p, V.add(V.mul(frame.x, Math.cos(angle) * radius), V.mul(frame.y, Math.sin(angle) * radius)));
  }

  function build() {
    const v = state.values, random = rng(state.seed), queue = [];
    elements = [];
    const cap = Math.min(10000, Math.round(v.budget));
    for (let i = 0; i < Math.round(v.stems); i++) queue.push({ frame: baseFrame(Math.PI * 2 * i / Math.round(v.stems), v.spread), size: 1, step: 0, depth: 0, limit: Math.round(v.steps) });
    while (queue.length && elements.length < cap) {
      const stem = queue.shift();
      if (stem.step >= stem.limit || stem.size < .025) continue;
      const count = Math.round(v.sides), radius = v.radius * stem.size;
      const jx = (random() * 2 - 1) * v.jitter, jy = (random() * 2 - 1) * v.jitter;
      const next = advanceFrame(stem.frame, stem.size, jx, jy);
      const points = [], nextPoints = [];
      for (let j = 0; j < count; j++) {
        const angle = Math.PI * 2 * j / count + v.twist * stem.step * RAD;
        const nextAngle = Math.PI * 2 * j / count + v.twist * (stem.step + 1) * RAD;
        points.push(ringPoint(stem.frame, radius, angle));
        nextPoints.push(ringPoint(next, radius * v.taper, nextAngle));
      }
      for (let j = 0; j < count && elements.length < cap; j++) {
        const p = points[j], n = nextPoints[j], q = points[(j + 1) % count];
        if (state.motif === 2) {
          elements.push({ kind: 'line', a: p, b: q, size: Math.max(.45, v.width * stem.size) });
          if (elements.length < cap) elements.push({ kind: 'line', a: p, b: n, size: Math.max(.45, v.width * stem.size) });
          if (elements.length < cap) elements.push({ kind: 'line', a: p, b: nextPoints[(j + 1) % count], size: Math.max(.45, v.depth * stem.size) });
        } else {
          elements.push({ kind: state.motif === 1 ? 'wedge' : 'block', p, size: Math.max(.55, (v.width + v.depth + v.length) / 3 * stem.size), angle: Math.PI * 2 * j / count + v.twist * stem.step * RAD });
        }
      }
      stem.frame = next; stem.size *= v.taper; stem.step++;
      if (stem.depth < Math.round(v.levels) && stem.step % Math.round(v.forkEvery) === 0 && stem.step < stem.limit - 8) {
        const childFrame = copyFrame(stem.frame);
        rotateFrame(childFrame, 'z', 137.50776 * stem.step * RAD);
        rotateFrame(childFrame, 'y', v.spread * RAD);
        queue.push({ frame: childFrame, size: stem.size * v.childScale, step: 0, depth: stem.depth + 1, limit: Math.max(12, Math.round((stem.limit - stem.step) * .82)) });
      }
      queue.push(stem);
    }
    computeBounds(); scheduleRender();
    $('#buildStats').textContent = `${elements.length.toLocaleString()} elements · seed ${state.seed}${elements.length >= cap ? ' · preview cap' : ''}`;
  }

  function computeBounds() {
    const points = [];
    elements.forEach(el => el.kind === 'line' ? points.push(el.a, el.b) : points.push(el.p));
    if (!points.length) { bounds = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 }, center: { x: 0, y: 0, z: 0 }, span: 2 }; return; }
    const min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
    points.forEach(p => ['x', 'y', 'z'].forEach(k => { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); }));
    bounds = { min, max, center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 }, span: Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 1) };
  }

  function transformPoint(p) {
    let x = p.x - bounds.center.x, y = p.y - bounds.center.y, z = p.z - bounds.center.z;
    const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
    [x, y] = [x * cy - y * sy, x * sy + y * cy];
    const cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
    [y, z] = [y * cp - z * sp, y * sp + z * cp];
    return { x, y: -z, depth: y };
  }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return rect;
  }
  function scheduleRender() {
    if (renderQueued) return; renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  }
  function render() {
    const rect = resizeCanvas(), w = rect.width, h = rect.height;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#e8ece4'); bg.addColorStop(1, '#d8ddd4'); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    if (!elements.length) return;
    const transformed = elements.map(el => {
      if (el.kind === 'line') { const a = transformPoint(el.a), b = transformPoint(el.b); return { ...el, a2: a, b2: b, d: (a.depth + b.depth) / 2 }; }
      const p = transformPoint(el.p); return { ...el, p2: p, d: p.depth };
    });
    const all = transformed.flatMap(el => el.kind === 'line' ? [el.a2, el.b2] : [el.p2]);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    all.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const scale = Math.min((w * .78) / Math.max(1, maxX - minX), (h * .72) / Math.max(1, maxY - minY)) * state.zoom;
    const cx = w / 2 + state.panX, cy = h / 2 + state.panY + 6;
    const project = p => ({ x: cx + p.x * scale, y: cy + p.y * scale });

    ctx.save(); ctx.globalAlpha = .16; ctx.strokeStyle = '#557069'; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const y = h * .78 + i * 12; ctx.beginPath(); ctx.moveTo(w * .18, y); ctx.lineTo(w * .82, y); ctx.stroke();
    }
    ctx.restore();

    transformed.sort((a, b) => a.d - b.d);
    const depthValues = transformed.map(e => e.d), low = Math.min(...depthValues), high = Math.max(...depthValues), span = high - low || 1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    transformed.forEach(el => {
      const light = (el.d - low) / span;
      if (el.kind === 'line') {
        const a = project(el.a2), b = project(el.b2);
        ctx.strokeStyle = `hsl(${164 + light * 8} ${22 + light * 8}% ${33 + light * 24}%)`;
        ctx.lineWidth = Math.max(.55, Math.min(5, el.size * scale * .16));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      } else {
        const p = project(el.p2), s = Math.max(1, Math.min(9, el.size * scale * .13));
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(el.angle + state.yaw * .35);
        ctx.fillStyle = `hsl(${164 + light * 10} ${18 + light * 15}% ${38 + light * 25}%)`;
        ctx.strokeStyle = `hsla(170 28% 20% / ${.18 + light * .18})`; ctx.lineWidth = .55;
        ctx.beginPath();
        if (el.kind === 'wedge') { ctx.moveTo(0, -s * 1.35); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath(); }
        else { ctx.roundRect(-s * 1.1, -s * .62, s * 2.2, s * 1.24, Math.max(.5, s * .18)); }
        ctx.fill(); ctx.stroke(); ctx.restore();
      }
    });
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(w * .52, h * .43, 0, w * .52, h * .43, Math.min(w, h) * .42);
    glow.addColorStop(0, 'rgba(215,237,102,.12)'); glow.addColorStop(1, 'rgba(215,237,102,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h); ctx.restore();
  }

  function resetView(shouldRender = true) {
    state.yaw = .55; state.pitch = .38; state.zoom = 1; state.panX = state.panY = 0;
    if (shouldRender) scheduleRender();
  }

  function thumbnail() {
    const out = document.createElement('canvas'); out.width = 348; out.height = 156;
    out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
    return out.toDataURL('image/jpeg', .74);
  }
  function saveIteration() {
    const item = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: `Iteration ${state.iterations.length + 1}`,
      created: new Date().toISOString(), image: thumbnail(), core: cloneCore(),
      prediction: $('#prediction').value.trim(), observation: $('#observation').value.trim()
    };
    state.iterations.push(item); if (state.iterations.length > 12) state.iterations.shift();
    state.selected = []; renderJournal(); saveLocal();
    $('#observation').value = ''; state.observation = '';
    toast(`Iteration ${state.iterations.length} saved`);
    if (state.mode === 'guided' && state.lesson < LESSONS.length - 1) { state.lesson++; renderLesson(); }
  }
  function renderJournal() {
    const strip = $('#iterationStrip');
    $('#journalCount').textContent = `${state.iterations.length} saved`;
    $('#compareBtn').disabled = state.iterations.length < 2;
    if (!state.iterations.length) {
      strip.innerHTML = `<button class="empty-iteration" id="emptySaveBtn"><span>＋</span><strong>Save your first iteration</strong><small>A snapshot, settings, and reflection will appear here.</small></button>`;
      $('#emptySaveBtn').addEventListener('click', saveIteration); return;
    }
    strip.innerHTML = state.iterations.map((item, i) => `<article class="iteration-card${state.selected.includes(item.id) ? ' selected' : ''}" data-id="${item.id}" role="button" tabindex="0" title="Click to select for comparison · Double-click to restore"><img src="${item.image}" alt="Preview of ${escapeHTML(item.name)}"><button class="iteration-delete" data-delete="${item.id}" aria-label="Delete ${escapeHTML(item.name)}">×</button><span class="iteration-meta"><span><strong>${escapeHTML(item.name)}</strong><small>${MOTIFS[item.core.motif]} · seed ${item.core.seed}</small></span><span class="iteration-number">0${i + 1}</span></span></article>`).join('');
  }
  function toggleIteration(id) {
    if (state.selected.includes(id)) state.selected = state.selected.filter(x => x !== id);
    else { state.selected.push(id); if (state.selected.length > 2) state.selected.shift(); }
    renderJournal();
  }
  function showCompare() {
    if (state.iterations.length < 2) return;
    const chosen = state.selected.length === 2 ? state.selected.map(id => state.iterations.find(x => x.id === id)) : state.iterations.slice(-2);
    const [a, b] = chosen;
    const diffs = PARAMS.filter(p => a.core.values[p.key] !== b.core.values[p.key]).map(p => `${p.label}: ${formatValue(p, a.core.values[p.key])} → ${formatValue(p, b.core.values[p.key])}`);
    $('#compareGuidance').textContent = diffs.length ? `${diffs.length} rule${diffs.length === 1 ? '' : 's'} changed. Look for visual evidence of each change.` : 'The rules match. Any difference comes from seed or viewing angle.';
    $('#compareGrid').innerHTML = [a, b].map((item, i) => `<article class="compare-card"><img src="${item.image}" alt="${escapeHTML(item.name)}"><div class="compare-copy"><h3>${escapeHTML(item.name)}</h3><p><strong>Prediction:</strong> ${escapeHTML(item.prediction || 'Not recorded')}</p><p><strong>Observation:</strong> ${escapeHTML(item.observation || 'Not recorded')}</p>${i === 1 && diffs.length ? `<div class="delta-list">${diffs.slice(0, 8).map(d => `<span>${escapeHTML(d)}</span>`).join('')}</div>` : ''}</div></article>`).join('');
    $('#compareDialog').showModal();
  }

  function recipeObject() {
    return { generator: 'FormGarden', version: 1, seed: state.seed, motif: state.motif, preset: state.preset, parameters: { ...state.values } };
  }
  function exportStudy(asOBJ = false) {
    if (asOBJ) { download(`form-garden-${state.seed}.obj`, buildOBJ(), 'text/plain'); toast('OBJ mesh proxy downloaded'); return; }
    const payload = { ...recipeObject(), study: { title: state.projectName, prediction: $('#prediction').value, observation: $('#observation').value, iterations: state.iterations } };
    download(`form-garden-study-${state.seed}.json`, JSON.stringify(payload, null, 2), 'application/json');
    toast('Study JSON downloaded · Shift-click Export for OBJ');
  }
  function buildOBJ() {
    const points = elements.filter(el => el.kind !== 'line').map(el => el.p);
    const span = bounds.span || 1, scale = state.values.exportMM / span;
    const lines = ['# Form Garden browser export', '# Proxy solids for saved study; units interpreted as mm', 'o FormGarden'];
    let base = 1;
    points.slice(0, 6000).forEach(p => {
      const c = { x: (p.x - bounds.center.x) * scale, y: (p.y - bounds.center.y) * scale, z: (p.z - bounds.min.z) * scale };
      const s = Math.max(.08, state.values.width * scale * .18);
      [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].forEach(v => lines.push(`v ${(c.x + v[0]*s).toFixed(5)} ${(c.y + v[1]*s).toFixed(5)} ${(c.z + v[2]*s).toFixed(5)}`));
      [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]].forEach(f => lines.push(`f ${base+f[0]} ${base+f[1]} ${base+f[2]}`)); base += 8;
    });
    return lines.join('\n');
  }
  function download(name, content, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importRecipe(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.generator !== 'FormGarden' || !data.parameters) throw new Error('This is not a FormGarden recipe.');
        const values = { ...BASE_VALUES };
        PARAMS.forEach(p => { if (Number.isFinite(Number(data.parameters[p.key]))) values[p.key] = Math.max(p.min, Math.min(p.max, Number(data.parameters[p.key]))); });
        restoreCore({ values, preset: Number(data.preset) || 0, motif: Number(data.motif) || 0, seed: Number(data.seed) || 4721 });
        if (data.study) {
          state.projectName = data.study.title || state.projectName; $('#projectName').value = state.projectName;
          state.iterations = Array.isArray(data.study.iterations) ? data.study.iterations.slice(-12) : state.iterations;
          $('#prediction').value = data.study.prediction || ''; $('#observation').value = data.study.observation || ''; renderJournal();
        }
        toast('Recipe imported');
      } catch (err) { toast(err.message || 'Could not import that file'); }
    };
    reader.readAsText(file);
  }

  function saveLocal() {
    try {
      localStorage.setItem('formGardenStudyV2', JSON.stringify({ core: cloneCore(), projectName: state.projectName, mode: state.mode, lesson: state.lesson, prediction: $('#prediction')?.value || '', observation: $('#observation')?.value || '', iterations: state.iterations }));
    } catch { /* Thumbnail storage can fill private-browser quotas; the live tool still works. */ }
  }
  function loadLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem('formGardenStudyV2'));
      if (!saved) return;
      if (saved.core) { state.values = { ...BASE_VALUES, ...saved.core.values }; state.preset = saved.core.preset || 0; state.motif = saved.core.motif || 0; state.seed = saved.core.seed || 4721; }
      state.projectName = saved.projectName || state.projectName; state.mode = saved.mode || 'guided'; state.lesson = Math.max(0, Math.min(LESSONS.length - 1, saved.lesson || 0));
      state.prediction = saved.prediction || ''; state.observation = saved.observation || ''; state.iterations = Array.isArray(saved.iterations) ? saved.iterations.slice(-12) : [];
    } catch { localStorage.removeItem('formGardenStudyV2'); }
  }
  function escapeHTML(value) { const div = document.createElement('div'); div.textContent = String(value); return div.innerHTML; }
  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function bindEvents() {
    $('#presetRow').addEventListener('click', e => { const btn = e.target.closest('[data-preset]'); if (btn) setPreset(Number(btn.dataset.preset)); });
    $('#controls').addEventListener('pointerdown', e => { if (e.target.matches('input[type="range"]')) inputStart = cloneCore(); });
    $('#controls').addEventListener('input', e => {
      const input = e.target.closest('input[type="range"]'); if (!input) return;
      const p = PARAMS.find(x => `param-${x.key}` === input.id); state.values[p.key] = Number(input.value);
      input.style.setProperty('--pct', `${((state.values[p.key] - p.min) / (p.max - p.min)) * 100}%`);
      input.closest('.control').querySelector('output').textContent = formatValue(p, state.values[p.key]); build();
    });
    $('#controls').addEventListener('change', e => { if (e.target.matches('input[type="range"]')) { pushUndo(inputStart); inputStart = null; saveLocal(); } });
    $('#motifBtn').addEventListener('click', () => { const before = cloneCore(); state.motif = (state.motif + 1) % MOTIFS.length; pushUndo(before); syncControls(); build(); saveLocal(); });
    $('#seedBtn').addEventListener('click', () => { const before = cloneCore(); state.seed = Math.floor(Math.random() * 2147483647); pushUndo(before); build(); saveLocal(); toast(`New variation · seed ${state.seed}`); });
    $('#fitBtn').addEventListener('click', () => { resetView(); toast('View reset'); });
    $('#resetBtn').addEventListener('click', () => setPreset(state.preset));
    $('#saveIterationBtn').addEventListener('click', saveIteration);
    $('#compareBtn').addEventListener('click', showCompare);
    $('#clearJournalBtn').addEventListener('click', () => { if (!state.iterations.length || !confirm('Clear every saved iteration in this study?')) return; state.iterations = []; state.selected = []; renderJournal(); saveLocal(); toast('Journal cleared'); });
    $('#iterationStrip').addEventListener('click', e => {
      const del = e.target.closest('[data-delete]');
      if (del) { e.stopPropagation(); const id = Number(del.dataset.delete); state.iterations = state.iterations.filter(x => x.id !== id); state.selected = state.selected.filter(x => x !== id); renderJournal(); saveLocal(); return; }
      const card = e.target.closest('[data-id]'); if (card) toggleIteration(Number(card.dataset.id));
    });
    $('#iterationStrip').addEventListener('dblclick', e => { const card = e.target.closest('[data-id]'); if (!card) return; const item = state.iterations.find(x => x.id === Number(card.dataset.id)); if (item) { restoreCore(item.core); toast(`${item.name} restored`); } });
    $('#iterationStrip').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-id]')) { e.preventDefault(); toggleIteration(Number(e.target.dataset.id)); } });
    $('#undoBtn').addEventListener('click', undo); $('#redoBtn').addEventListener('click', redo);
    $('#exportBtn').title = 'Download study JSON · Shift-click for OBJ';
    $('#exportBtn').addEventListener('click', e => exportStudy(e.shiftKey));
    $('#importBtn').addEventListener('click', () => $('#fileInput').click());
    $('#fileInput').addEventListener('change', e => { if (e.target.files[0]) importRecipe(e.target.files[0]); e.target.value = ''; });
    $$('.mode-switch button').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    $('#lessonSteps').addEventListener('click', e => { const btn = e.target.closest('[data-lesson]'); if (btn) { state.lesson = Number(btn.dataset.lesson); renderLesson(); saveLocal(); } });
    $('#promptBtn').addEventListener('click', () => { const current = $('#promptLabel').textContent; const options = PROMPTS.filter(p => p !== current); $('#promptLabel').textContent = options[Math.floor(Math.random() * options.length)]; });
    $('#prediction').addEventListener('input', saveLocal); $('#observation').addEventListener('input', saveLocal);
    $('#projectName').addEventListener('input', e => { state.projectName = e.target.value; saveLocal(); });

    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch, panX: state.panX, panY: state.panY, pan: e.shiftKey || e.button === 2 }; });
    canvas.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (drag.pan) { state.panX = drag.panX + dx; state.panY = drag.panY + dy; } else { state.yaw = drag.yaw + dx * .009; state.pitch = Math.max(-1.3, Math.min(1.3, drag.pitch + dy * .009)); } scheduleRender(); });
    canvas.addEventListener('pointerup', () => { drag = null; }); canvas.addEventListener('pointercancel', () => { drag = null; }); canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { e.preventDefault(); state.zoom = Math.max(.2, Math.min(5, state.zoom * Math.exp(-e.deltaY * .001))); scheduleRender(); }, { passive: false });
    window.addEventListener('resize', scheduleRender);
    window.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveIteration(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (e.key >= '1' && e.key <= '4' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) setPreset(Number(e.key) - 1);
    });
  }

  loadLocal();
  renderControls(); renderLesson(); renderJournal(); setMode(state.mode);
  $('#projectName').value = state.projectName; $('#prediction').value = state.prediction; $('#observation').value = state.observation;
  bindEvents(); build(); updateUndoButtons();
})();
