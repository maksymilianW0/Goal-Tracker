/* app.js — split add button version */
'use strict';

/* STORAGE */
const STORAGE_KEYS = {
  SIMPLE_GOALS: 'simpleGoals_split',
  CATEGORIES: 'simpleGoalCategories_split'
};

let simpleGoals = [];
let categories = [];

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SIMPLE_GOALS);
    const rawC = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    simpleGoals = raw ? JSON.parse(raw) : [];
    categories = rawC ? JSON.parse(rawC) : [];
  } catch (e) {
    console.error('loadData error', e);
    simpleGoals = [];
    categories = [];
  }
}
function saveData() {
  localStorage.setItem(STORAGE_KEYS.SIMPLE_GOALS, JSON.stringify(simpleGoals));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
}

/* DOM refs */
const dom = {
  addSplit: document.getElementById('addSplit'),
  addSimpleGoalBtn: document.getElementById('addSimpleGoalBtn'),
  toggleAddMenuBtn: document.getElementById('toggleAddMenuBtn'),
  addGoalMenu: document.getElementById('addGoalMenu'),

  logoutBtn: document.getElementById('logoutBtn'),
  simpleGoalGrid: document.getElementById('simpleGoalGrid'),

  // simple modal
  simpleGoalModalBg: document.getElementById('simpleGoalModalBg'),
  simpleGoalModalTitle: document.getElementById('simpleGoalModalTitle'),
  simpleGoalTitle: document.getElementById('simpleGoalTitle'),
  simpleGoalDesc: document.getElementById('simpleGoalDesc'),
  simpleGoalCategory: document.getElementById('simpleGoalCategory'),
  newSimpleCategoryInput: document.getElementById('newSimpleCategoryInput'),
  saveSimpleGoalBtn: document.getElementById('saveSimpleGoalBtn'),

  // progress modal
  progressGoalModalBg: document.getElementById('progressGoalModalBg'),
  progressGoalModalTitle: document.getElementById('progressGoalModalTitle'),
  progressGoalTitle: document.getElementById('progressGoalTitle'),
  progressGoalDesc: document.getElementById('progressGoalDesc'),
  progressGoalCategory: document.getElementById('progressGoalCategory'),
  newProgressCategoryInput: document.getElementById('newProgressCategoryInput'),
  progressGoalRange: document.getElementById('progressGoalRange'),
  progressGoalValue: document.getElementById('progressGoalValue'),
  saveProgressGoalBtn: document.getElementById('saveProgressGoalBtn')
};

/* Dropdown (split) */
let dropdownOpen = false;
function openAddDropdown() {
  dom.addGoalMenu.style.display = 'flex';
  dom.addGoalMenu.setAttribute('aria-hidden', 'false');
  dom.toggleAddMenuBtn.setAttribute('aria-expanded', 'true');
  dropdownOpen = true;
}
function closeAddDropdown() {
  dom.addGoalMenu.style.display = 'none';
  dom.addGoalMenu.setAttribute('aria-hidden', 'true');
  dom.toggleAddMenuBtn.setAttribute('aria-expanded', 'false');
  dropdownOpen = false;
}

// left main button = add simpleGoal
dom.addSimpleGoalBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openSimpleGoalModal(null);
  closeAddDropdown();
});

// right small toggle opens menu
dom.toggleAddMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (dropdownOpen) closeAddDropdown();
  else openAddDropdown();
});

// clicking menu items
dom.addGoalMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('.menu-item');
  if (!btn) return;
  const type = btn.dataset.type;
  closeAddDropdown();
  if (type === 'simple') openSimpleGoalModal(null);
  else if (type === 'progress') openProgressGoalModal(null);
  else if (type === 'habit') alert('habitGoal jeszcze nie zaimplementowany — niedługo dorzucę 😉');
});

// close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!dom.addSplit.contains(e.target)) closeAddDropdown();
});

// esc closes dropdown + modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAddDropdown();
    closeAllModals();
  }
});

/* Helpers for categories */
function refreshSimpleCategories(selected = '') {
  const sel = dom.simpleGoalCategory;
  if (!sel) return;
  sel.innerHTML = '<option value="">(brak)</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === selected) opt.selected = true;
    sel.appendChild(opt);
  });
  const addOpt = document.createElement('option');
  addOpt.value = '__new';
  addOpt.textContent = '➕ Dodaj nową kategorię';
  sel.appendChild(addOpt);
}
function refreshProgressCategories(selected = '') {
  const sel = dom.progressGoalCategory;
  if (!sel) return;
  sel.innerHTML = '<option value="">(brak)</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === selected) opt.selected = true;
    sel.appendChild(opt);
  });
  const addOpt = document.createElement('option');
  addOpt.value = '__new';
  addOpt.textContent = '➕ Dodaj nową kategorię';
  sel.appendChild(addOpt);
}

/* RENDER */
function clearGrid() { dom.simpleGoalGrid.innerHTML = ''; }
function renderAllGoals() {
  clearGrid();
  simpleGoals.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'card' + (g.done ? ' card-done' : '');

    const title = document.createElement('h3');
    title.textContent = g.title;
    card.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = g.desc || '';
    card.appendChild(desc);

    const cat = document.createElement('div');
    cat.className = 'category';
    cat.textContent = g.category || '(brak kategorii)';
    card.appendChild(cat);

    if (g.type === 'progressGoal') {
      const progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      fill.style.width = (g.progress || 0) + '%';
      progressBar.appendChild(fill);
      card.appendChild(progressBar);

      const status = document.createElement('div');
      status.className = 'status';
      status.textContent = `Postęp: ${g.progress || 0}%`;
      card.appendChild(status);
    } else {
      const status = document.createElement('div');
      status.className = 'status';
      status.textContent = g.done ? '✅ Ukończone' : '❌ Nieukończone';
      card.appendChild(status);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.title = 'Oznacz jako ukończone/nie';
    doneBtn.textContent = g.done ? '✅' : '☑️';
    doneBtn.onclick = () => {
      g.done = !g.done;
      saveData();
      document.dispatchEvent(new Event('simpleDataChanged'));
    };

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.title = 'Edytuj';
    editBtn.textContent = '✏️';
    editBtn.onclick = () => {
      if (g.type === 'progressGoal') openProgressGoalModal(i);
      else openSimpleGoalModal(i);
    };

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.title = 'Usuń';
    delBtn.textContent = '🗑️';
    delBtn.onclick = () => {
      const ok = confirm(`Usunąć cel: "${g.title}"?`);
      if (ok) { simpleGoals.splice(i, 1); saveData(); document.dispatchEvent(new Event('simpleDataChanged')); }
    };

    actions.appendChild(doneBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(actions);
    dom.simpleGoalGrid.appendChild(card);
  });
}

/* SIMPLE GOAL MODAL */
let editSimpleIndex = null;
function openSimpleGoalModal(index = null) {
  editSimpleIndex = index;
  dom.simpleGoalModalBg.style.display = 'flex';
  dom.simpleGoalModalBg.setAttribute('aria-hidden', 'false');

  if (index === null) {
    dom.simpleGoalModalTitle.textContent = 'Dodaj simpleGoal';
    dom.simpleGoalTitle.value = '';
    dom.simpleGoalDesc.value = '';
    dom.newSimpleCategoryInput.classList.add('hidden');
    refreshSimpleCategories();
  } else {
    const g = simpleGoals[index];
    if (!g) return;
    dom.simpleGoalModalTitle.textContent = 'Edytuj simpleGoal';
    dom.simpleGoalTitle.value = g.title;
    dom.simpleGoalDesc.value = g.desc || '';
    dom.newSimpleCategoryInput.classList.add('hidden');
    refreshSimpleCategories(g.category);
  }
  setTimeout(() => dom.simpleGoalTitle.focus(), 50);
}

function closeAllModals() {
  dom.simpleGoalModalBg.style.display = 'none';
  dom.simpleGoalModalBg.setAttribute('aria-hidden', 'true');
  dom.progressGoalModalBg.style.display = 'none';
  dom.progressGoalModalBg.setAttribute('aria-hidden', 'true');
}

dom.simpleGoalModalBg.addEventListener('click', (e) => { if (e.target === dom.simpleGoalModalBg) closeAllModals(); });
dom.simpleGoalCategory.addEventListener('change', () => {
  if (dom.simpleGoalCategory.value === '__new') { dom.newSimpleCategoryInput.classList.remove('hidden'); dom.newSimpleCategoryInput.focus(); }
  else dom.newSimpleCategoryInput.classList.add('hidden');
});
dom.saveSimpleGoalBtn.addEventListener('click', () => {
  const title = dom.simpleGoalTitle.value.trim();
  const desc = dom.simpleGoalDesc.value.trim();
  let category = dom.simpleGoalCategory.value;
  if (category === '__new') {
    const newCat = dom.newSimpleCategoryInput.value.trim();
    if (newCat) { category = newCat; if (!categories.includes(newCat)) categories.push(newCat); } else category = '';
  }
  if (!title) { alert('Tytuł jest wymagany.'); return; }
  const payload = { type: 'simpleGoal', title, desc, category, done: false };
  if (editSimpleIndex === null) simpleGoals.push(payload); else { payload.done = simpleGoals[editSimpleIndex].done || false; simpleGoals[editSimpleIndex] = payload; }
  saveData();
  document.dispatchEvent(new Event('simpleDataChanged'));
  closeAllModals();
});

/* PROGRESS GOAL MODAL */
let editProgressIndex = null;
function openProgressGoalModal(index = null) {
  editProgressIndex = index;
  dom.progressGoalModalBg.style.display = 'flex';
  dom.progressGoalModalBg.setAttribute('aria-hidden', 'false');

  if (index === null) {
    dom.progressGoalModalTitle.textContent = 'Dodaj progressGoal';
    dom.progressGoalTitle.value = '';
    dom.progressGoalDesc.value = '';
    dom.newProgressCategoryInput.classList.add('hidden');
    dom.progressGoalRange.value = 0;
    dom.progressGoalValue.textContent = '0%';
    refreshProgressCategories();
  } else {
    const g = simpleGoals[index];
    if (!g) return;
    dom.progressGoalModalTitle.textContent = 'Edytuj progressGoal';
    dom.progressGoalTitle.value = g.title;
    dom.progressGoalDesc.value = g.desc || '';
    dom.newProgressCategoryInput.classList.add('hidden');
    dom.progressGoalRange.value = g.progress || 0;
    dom.progressGoalValue.textContent = (g.progress || 0) + '%';
    refreshProgressCategories(g.category);
  }
  setTimeout(() => dom.progressGoalTitle.focus(), 50);
}
dom.progressGoalModalBg.addEventListener('click', (e) => { if (e.target === dom.progressGoalModalBg) closeAllModals(); });
dom.progressGoalCategory.addEventListener('change', () => {
  if (dom.progressGoalCategory.value === '__new') { dom.newProgressCategoryInput.classList.remove('hidden'); dom.newProgressCategoryInput.focus(); }
  else dom.newProgressCategoryInput.classList.add('hidden');
});
dom.progressGoalRange.addEventListener('input', () => { dom.progressGoalValue.textContent = dom.progressGoalRange.value + '%'; });
dom.saveProgressGoalBtn.addEventListener('click', () => {
  const title = dom.progressGoalTitle.value.trim();
  const desc = dom.progressGoalDesc.value.trim();
  let category = dom.progressGoalCategory.value;
  const progress = parseInt(dom.progressGoalRange.value, 10) || 0;
  if (category === '__new') {
    const newCat = dom.newProgressCategoryInput.value.trim();
    if (newCat) { category = newCat; if (!categories.includes(newCat)) categories.push(newCat); } else category = '';
  }
  if (!title) { alert('Tytuł jest wymagany.'); return; }
  const payload = { type: 'progressGoal', title, desc, category, progress, done: progress >= 100 };
  if (editProgressIndex === null) simpleGoals.push(payload); else simpleGoals[editProgressIndex] = payload;
  saveData();
  document.dispatchEvent(new Event('simpleDataChanged'));
  closeAllModals();
});

/* INIT */
function initApp() {
  dom.logoutBtn.addEventListener('click', () => { alert('Wylogowano! (localStorage wyczyszczone)'); localStorage.clear(); window.location.reload(); });
  document.addEventListener('simpleDataChanged', () => { refreshSimpleCategories(); refreshProgressCategories(); renderAllGoals(); });
  loadData();
  refreshSimpleCategories();
  refreshProgressCategories();
  renderAllGoals();
  // ensure dropdown closes when window loses focus
  window.addEventListener('blur', () => closeAddDropdown());
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp); else initApp();
