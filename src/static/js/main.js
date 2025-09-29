function genId(){ if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); return 'id-' + Math.random().toString(36).slice(2,9); }
function todayStr(){ const d=new Date(); return d.toISOString().split('T')[0]; }
function daysBetween(a,b){ const A=new Date(a+'T00:00:00'), B=new Date(b+'T00:00:00'); return Math.floor((B-A)/(1000*60*60*24)); }/* app.js – multi-type goals: simpleGoal, progressGoal, habitGoal, streakGoal
   poprz. zmiany: streakGoal ma opis; finished goals mają klasę .card-done; logout button style przywrócony 
   NAPRAWIONO: błędy w computeBestStreak, renderStats, failDates array handling, collapsible sections */
'use strict';

const STORAGE_KEY = 'goals_v1';
const API_BASE_URL = ''; // Pusty - używamy relatywnych URLi
let goals = [];
let categories = [];
let isOnline = navigator.onLine;
let syncInProgress = false;

// API Configuration
const API_CONFIG = {
  timeout: 10000, // 10 sekund
  retries: 3,
  retryDelay: 1000 // 1 sekunda
};

/* ========== API FUNCTIONS ========== */
async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  
  try {
    const response = await fetch(`/api${endpoint}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

async function saveToAPI(data, retryCount = 0) {
  try {
    showSyncStatus('saving');
    const response = await apiRequest('/save', {
      method: 'POST',
      body: JSON.stringify({ goals: data })
    });
    
    console.log('✅ Saved to API successfully');
    showSyncStatus('synced');
    return response;
  } catch (error) {
    console.error('❌ API Save error:', error);
    
    if (retryCount < API_CONFIG.retries) {
      console.log(`🔄 Retrying save... (${retryCount + 1}/${API_CONFIG.retries})`);
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
      return saveToAPI(data, retryCount + 1);
    }
    
    // Fallback to localStorage
    console.log('💾 Falling back to localStorage');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY + '_needs_sync', 'true');
    showSyncStatus('offline');
    throw error;
  }
}

async function loadFromAPI(retryCount = 0) {
  try {
    showSyncStatus('loading');
    const response = await apiRequest('/load');
    
    console.log('✅ Loaded from API successfully');
    showSyncStatus('synced');
    
    // Save to localStorage as backup
    if (response.goals) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.goals));
      localStorage.removeItem(STORAGE_KEY + '_needs_sync');
      return response.goals;
    }
    
    return [];
  } catch (error) {
    console.error('❌ API Load error:', error);
    
    if (retryCount < API_CONFIG.retries) {
      console.log(`🔄 Retrying load... (${retryCount + 1}/${API_CONFIG.retries})`);
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
      return loadFromAPI(retryCount + 1);
    }
    
    // Fallback to localStorage
    console.log('💾 Falling back to localStorage');
    const localData = localStorage.getItem(STORAGE_KEY);
    showSyncStatus('offline');
    return localData ? JSON.parse(localData) : [];
  }
}

/* ========== SYNC STATUS UI ========== */
function showSyncStatus(status) {
  let statusEl = document.getElementById('syncStatus');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'syncStatus';
    statusEl.className = 'sync-status';
    document.body.appendChild(statusEl);
  }
  
  const statusConfig = {
    saving: { text: '💾 Zapisywanie...', class: 'saving' },
    loading: { text: '📥 Ładowanie...', class: 'loading' },
    synced: { text: '✅ Zsynchronizowano', class: 'synced' },
    offline: { text: '📱 Tryb offline', class: 'offline' },
    error: { text: '❌ Błąd synchronizacji', class: 'error' }
  };
  
  const config = statusConfig[status] || statusConfig.error;
  statusEl.textContent = config.text;
  statusEl.className = `sync-status ${config.class}`;
  
  // Auto-hide success messages
  if (status === 'synced') {
    setTimeout(() => {
      statusEl.style.opacity = '0';
      setTimeout(() => statusEl.remove(), 300);
    }, 2000);
  }
}

/* ========== SYNC LOGIC ========== */
async function syncPendingChanges() {
  const needsSync = localStorage.getItem(STORAGE_KEY + '_needs_sync');
  if (!needsSync || syncInProgress) return;
  
  syncInProgress = true;
  try {
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      const goals = JSON.parse(localData);
      await saveToAPI(goals);
    }
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    syncInProgress = false;
  }
}

// Auto-sync when coming online
window.addEventListener('online', () => {
  isOnline = true;
  console.log('🌐 Back online - syncing...');
  syncPendingChanges();
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('📱 Gone offline');
  showSyncStatus('offline');
});

/* ========== UPDATED SAVE/LOAD FUNCTIONS ========== */
async function save() { 
  try {
    if (isOnline) {
      await saveToAPI(goals);
    } else {
      // Offline - save to localStorage with sync flag
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
      localStorage.setItem(STORAGE_KEY + '_needs_sync', 'true');
      showSyncStatus('offline');
    }
  } catch (error) {
    console.error('Save error:', error);
    showSyncStatus('error');
  }
}

async function load() { 
  try { 
    if (isOnline) {
      goals = await loadFromAPI();
    } else {
      // Offline - load from localStorage
      const raw = localStorage.getItem(STORAGE_KEY);
      goals = raw ? JSON.parse(raw) : [];
      showSyncStatus('offline');
    }
    
    // Rebuild categories
    const set = new Set(); 
    goals.forEach(g => g.category && set.add(g.category)); 
    categories = Array.from(set); 
  } catch(e) { 
    console.error('Load error:', e); 
    goals = []; 
    categories = []; 
    showSyncStatus('error');
  } 
}

const dom = {
  addSplit: document.getElementById('addSplit'),
  addSimpleGoalBtn: document.getElementById('addSimpleGoalBtn'),
  toggleAddMenuBtn: document.getElementById('toggleAddMenuBtn'),
  addGoalMenu: document.getElementById('addGoalMenu'),
  goalsGrid: document.getElementById('goalsGrid'),
  logoutBtn: document.getElementById('logoutBtn'),

  // Search & Filters
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  typeFilter: document.getElementById('typeFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  statusFilter: document.getElementById('statusFilter'),
  sortFilter: document.getElementById('sortFilter'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  resultsCount: document.getElementById('resultsCount'),
  activeFiltersInfo: document.getElementById('activeFiltersInfo'),

  // Collapsible controls
  toggleFilters: document.getElementById('toggleFilters'),
  toggleStats: document.getElementById('toggleStats'),
  filtersSection: document.getElementById('filtersSection'),
  statsSection: document.getElementById('statsSection'),

  // Simple modal
  simpleBg: document.getElementById('simpleGoalModalBg'),
  simpleTitle: document.getElementById('simpleGoalTitle'),
  simpleDesc: document.getElementById('simpleGoalDesc'),
  simpleCategory: document.getElementById('simpleGoalCategory'),
  newSimpleCat: document.getElementById('newSimpleCategoryInput'),
  simpleDeadline: document.getElementById('simpleGoalDeadline'),
  saveSimpleBtn: document.getElementById('saveSimpleGoalBtn'),

  // Progress modal
  progressBg: document.getElementById('progressGoalModalBg'),
  progressTitle: document.getElementById('progressGoalTitle'),
  progressDesc: document.getElementById('progressGoalDesc'),
  progressCategory: document.getElementById('progressGoalCategory'),
  newProgressCat: document.getElementById('newProgressCategoryInput'),
  progressRange: document.getElementById('progressGoalRange'),
  progressValue: document.getElementById('progressGoalValue'),
  saveProgressBtn: document.getElementById('saveProgressGoalBtn'),

  // Habit modal
  habitBg: document.getElementById('habitGoalModalBg'),
  habitTitle: document.getElementById('habitGoalTitle'),
  habitDesc: document.getElementById('habitGoalDesc'),
  habitCategory: document.getElementById('habitGoalCategory'),
  newHabitCat: document.getElementById('newHabitCategoryInput'),
  saveHabitBtn: document.getElementById('saveHabitGoalBtn'),

  // Streak modal (added desc)
  streakBg: document.getElementById('streakGoalModalBg'),
  streakTitle: document.getElementById('streakGoalTitle'),
  streakDesc: document.getElementById('streakGoalDesc'),
  streakCategory: document.getElementById('streakGoalCategory'),
  newStreakCat: document.getElementById('newStreakCategoryInput'),
  streakStartDate: document.getElementById('streakStartDate'),
  saveStreakBtn: document.getElementById('saveStreakGoalBtn')
};

/* Dropdown split */
let dropdownOpen = false;
function openDropdown(){ dom.addGoalMenu.classList.add('open'); dom.toggleAddMenuBtn.setAttribute('aria-expanded','true'); dropdownOpen=true; }
function closeDropdown(){ dom.addGoalMenu.classList.remove('open'); dom.toggleAddMenuBtn.setAttribute('aria-expanded','false'); dropdownOpen=false; }

dom.addSimpleGoalBtn.addEventListener('click', (e)=>{ e.stopPropagation(); openSimpleModal(null); closeDropdown(); });
dom.toggleAddMenuBtn.addEventListener('click', (e)=>{ e.stopPropagation(); dropdownOpen?closeDropdown():openDropdown(); });

dom.addGoalMenu.addEventListener('click', (e)=>{ const btn=e.target.closest('.menu-item'); if(!btn) return; const type=btn.dataset.type; closeDropdown(); if(type==='simple') openSimpleModal(null); else if(type==='progress') openProgressModal(null); else if(type==='habit') openHabitModal(null); else if(type==='streak') openStreakModal(null); });

document.addEventListener('click', (e)=>{ if(!dom.addSplit.contains(e.target)) closeDropdown(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ closeDropdown(); closeAllModals(); } });

/* categories */
function refreshCategoriesIn(sel, selected=''){ if(!sel) return; sel.innerHTML = '<option value="">(brak)</option>'; categories.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; if(c===selected) o.selected=true; sel.appendChild(o); }); const add=document.createElement('option'); add.value='__new'; add.textContent='➕ Dodaj nową kategorię'; sel.appendChild(add); }

function refreshCategoryFilter() {
  if (!dom.categoryFilter) return;
  dom.categoryFilter.innerHTML = '<option value="">Wszystkie kategorie</option>';
  categories.forEach(c => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    dom.categoryFilter.appendChild(o);
  });
}

/* ========== SEARCH & FILTER LOGIC ========== */
let currentFilters = {
  search: '',
  type: '',
  category: '',
  status: '',
  sort: 'newest'
};

let filteredGoals = [];

function applyFiltersAndSort() {
  // Start with all goals
  let filtered = [...goals];
  
  // Apply search filter
  if (currentFilters.search.trim()) {
    const searchTerm = currentFilters.search.toLowerCase();
    filtered = filtered.filter(g => 
      (g.title || '').toLowerCase().includes(searchTerm) ||
      (g.desc || '').toLowerCase().includes(searchTerm) ||
      (g.category || '').toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply type filter
  if (currentFilters.type) {
    filtered = filtered.filter(g => g.type === currentFilters.type);
  }
  
  // Apply category filter
  if (currentFilters.category) {
    filtered = filtered.filter(g => g.category === currentFilters.category);
  }
  
  // Apply status filter
  if (currentFilters.status === 'completed') {
    filtered = filtered.filter(g => g.done);
  } else if (currentFilters.status === 'active') {
    filtered = filtered.filter(g => !g.done);
  } else if (currentFilters.status === 'overdue') {
    const today = todayStr();
    filtered = filtered.filter(g => 
      g.type === 'simpleGoal' && 
      g.deadline && 
      !g.done && 
      g.deadline < today
    );
  }
  
  // Apply sorting
  switch (currentFilters.sort) {
    case 'newest':
      filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      break;
    case 'oldest':
      filtered.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      break;
    case 'alphabetical':
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'deadline':
      filtered.sort((a, b) => {
        const aDeadline = a.deadline || '9999-12-31';
        const bDeadline = b.deadline || '9999-12-31';
        return aDeadline.localeCompare(bDeadline);
      });
      break;
    case 'progress':
      filtered.sort((a, b) => (b.progress || 0) - (a.progress || 0));
      break;
  }
  
  filteredGoals = filtered;
  renderFilteredGoals();
  updateResultsInfo();
}

function updateResultsInfo() {
  if (!dom.resultsCount) return;
  
  const count = filteredGoals.length;
  const total = goals.length;
  
  dom.resultsCount.textContent = count === total ? 
    `${count} ${count === 1 ? 'cel' : count < 5 ? 'cele' : 'celów'}` :
    `${count} z ${total}`;
  
  // Show active filters info (only in expanded filters section)
  const activeFilters = [];
  if (currentFilters.search) activeFilters.push(`"${currentFilters.search}"`);
  if (currentFilters.type) {
    const typeNames = {
      simpleGoal: 'Simple Goal',
      progressGoal: 'Progress Goal', 
      habitGoal: 'Habit Goal',
      streakGoal: 'Streak Goal'
    };
    activeFilters.push(typeNames[currentFilters.type]);
  }
  if (currentFilters.category) activeFilters.push(currentFilters.category);
  if (currentFilters.status) {
    const statusNames = {
      completed: 'Ukończone',
      active: 'Aktywne',
      overdue: 'Przeterminowane'
    };
    activeFilters.push(statusNames[currentFilters.status]);
  }
  
  if (dom.activeFiltersInfo) {
    dom.activeFiltersInfo.textContent = activeFilters.length > 0 ? 
      `Aktywne filtry: ${activeFilters.join(', ')}` : 'Brak aktywnych filtrów';
  }
}

function clearAllFilters() {
  currentFilters = {
    search: '',
    type: '',
    category: '',
    status: '',
    sort: 'newest'
  };
  
  // Update UI
  if (dom.searchInput) dom.searchInput.value = '';
  if (dom.typeFilter) dom.typeFilter.value = '';
  if (dom.categoryFilter) dom.categoryFilter.value = '';
  if (dom.statusFilter) dom.statusFilter.value = '';
  if (dom.sortFilter) dom.sortFilter.value = 'newest';
  
  applyFiltersAndSort();
}

/* ========== COLLAPSIBLE SECTIONS LOGIC ========== */
function toggleSection(button, section) {
  const isExpanded = button.getAttribute('aria-expanded') === 'true';
  const newState = !isExpanded;
  
  button.setAttribute('aria-expanded', newState);
  
  if (newState) {
    section.classList.remove('collapsed');
  } else {
    section.classList.add('collapsed');
  }
}

function setupCollapsibleControls() {
  if (dom.toggleFilters && dom.filtersSection) {
    dom.toggleFilters.addEventListener('click', () => {
      toggleSection(dom.toggleFilters, dom.filtersSection);
    });
  }
  
  if (dom.toggleStats && dom.statsSection) {
    dom.toggleStats.addEventListener('click', () => {
      toggleSection(dom.toggleStats, dom.statsSection);
    });
  }
}

/* utilities - NAPRAWIONO computeBestStreak */
function getLastNDates(n){ const arr=[]; for(let i=n-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); arr.push(d.toISOString().split('T')[0]); } return arr; }
function toggleHabit(goalId,dateStr){ const g = goals.find(x=>x.id===goalId); if(!g) return; g.history = g.history || {}; g.history[dateStr] = !g.history[dateStr]; save(); renderAll(); }

function computeBestStreak(goal) {
  if (!goal || goal.type !== 'streakGoal') return 0;
  
  // Jeśli mamy już zapisaną najlepszą serię, zwróć ją
  if (goal.bestStreak && typeof goal.bestStreak === 'number') {
    return goal.bestStreak;
  }
  
  // W przeciwnym razie policz aktualną serię
  const startDate = goal.startDate || (goal.createdAt ? goal.createdAt.split('T')[0] : todayStr());
  const lastFail = goal.lastFail || null;
  const base = lastFail || startDate;
  
  return Math.max(0, daysBetween(base, todayStr()));
}

function recordFail(goalId){ 
  const g = goals.find(x=>x.id===goalId); 
  if(!g) return; 
  
  // Inicjalizuj failDates jeśli nie istnieje
  if (!Array.isArray(g.failDates)) {
    g.failDates = [];
  }
  
  const base = g.lastFail || g.startDate || (g.createdAt ? g.createdAt.split('T')[0] : todayStr()); 
  const cur = Math.max(0, daysBetween(base, todayStr())); 
  g.bestStreak = Math.max(g.bestStreak||0, cur); 
  g.lastFail = todayStr(); 
  g.failDates.push(todayStr());
  
  save(); 
  renderAll(); 
}

/* render */
function clearGrid(){ dom.goalsGrid.innerHTML = ''; }

function renderFilteredGoals(){
  clearGrid();
  filteredGoals.forEach((g, originalIdx)=>{
    // Find original index in goals array
    const realIdx = goals.findIndex(goal => goal.id === g.id);
    if (realIdx === -1) return;
    
    const card = document.createElement('div');
    card.className = 'card' + (g.done ? ' card-done' : '');

    const h = document.createElement('h3'); h.textContent = g.title || '(bez tytułu)';
    card.appendChild(h);

    if (g.desc) { const p=document.createElement('p'); p.textContent=g.desc; card.appendChild(p); }

    const meta = document.createElement('div'); meta.className='meta';
    const left = document.createElement('div'); left.textContent = g.category || '';
    const right = document.createElement('div');
    if (g.type==='simpleGoal' && g.deadline) right.textContent = '📅 ' + g.deadline;
    meta.appendChild(left); meta.appendChild(right);
    card.appendChild(meta);

    // type-specific
    if (g.type==='progressGoal') {
      const pb = document.createElement('div'); pb.className='progress-bar';
      const fill = document.createElement('div'); fill.className='progress-fill'; fill.style.width = (g.progress||0)+'%';
      pb.appendChild(fill); card.appendChild(pb);
      const st = document.createElement('div'); st.className='meta'; st.textContent = `Postęp: ${g.progress||0}%`; card.appendChild(st);
    } else if (g.type==='habitGoal') {
      const dots = document.createElement('div'); dots.className='habit-dots';
      const last7 = getLastNDates(7);
      last7.forEach(date=>{
        const dot = document.createElement('div'); dot.className='habit-dot';
        if (g.history && g.history[date]) { dot.classList.add('done'); dot.textContent='✓'; }
        dot.title = date;
        dot.addEventListener('click', ()=>{ toggleHabit(g.id, date); });
        dots.appendChild(dot);
      });
      card.appendChild(dots);
    } else if (g.type==='streakGoal') {
      const base = g.lastFail || g.startDate || (g.createdAt ? g.createdAt.split('T')[0] : todayStr());
      const current = Math.max(0, daysBetween(base, todayStr()));
      const info = document.createElement('div'); info.className='streak-info';
      const count = document.createElement('div'); count.className='streak-count'; count.textContent = current;
      const label = document.createElement('div'); label.textContent = 'dni w serii';
      info.appendChild(count); info.appendChild(label);
      card.appendChild(info);
      if (g.bestStreak) { const best = document.createElement('div'); best.className='meta'; best.textContent = `Najlepsza seria: ${g.bestStreak}`; card.appendChild(best); }
      const fail = document.createElement('button'); fail.className='fail-btn'; fail.textContent='Przełamałem się ❌';
      fail.addEventListener('click', ()=>{ recordFail(g.id); });
      card.appendChild(fail);
    } else if (g.type==='simpleGoal') {
      const status = document.createElement('div'); status.className='meta'; status.textContent = g.done ? '✅ Ukończone' : '❌ Nieukończone';
      card.appendChild(status);
    }

    // actions
    const actions = document.createElement('div'); actions.className='actions';
    if (g.type==='simpleGoal' || g.type==='progressGoal') {
      const doneBtn = document.createElement('button'); doneBtn.textContent = g.done ? '✅' : '☑️'; doneBtn.title='Oznacz jako ukończone/nie';
      doneBtn.addEventListener('click', ()=>{ g.done = !g.done; save(); renderAll(); });
      actions.appendChild(doneBtn);
    }
    const editBtn = document.createElement('button'); editBtn.textContent='✏️'; editBtn.title='Edytuj';
    editBtn.addEventListener('click', ()=>{ openModalForType(g.type, realIdx); });
    const delBtn = document.createElement('button'); delBtn.textContent='🗑️'; delBtn.title='Usuń';
    delBtn.addEventListener('click', ()=>{ if(confirm(`Usunąć "${g.title}"?`)){ goals.splice(realIdx,1); save(); renderAll(); } });
    actions.appendChild(editBtn); actions.appendChild(delBtn);

    card.appendChild(actions);
    dom.goalsGrid.appendChild(card);
  });
  
  renderStats();
}

function renderAll(){
  refreshCategoryFilter();
  applyFiltersAndSort();
}

/* ========== Stats computations & rendering - NAPRAWIONO ========== */
function computeStats() {
  const total = goals.length;
  const completed = goals.filter(g => !!g.done).length;

  const countsByType = goals.reduce((acc, g) => {
    acc[g.type] = (acc[g.type] || 0) + 1; return acc;
  }, {});

  // avg progress for progressGoal
  const progressGoals = goals.filter(g => g.type === 'progressGoal');
  const avgProgress = progressGoals.length ? Math.round(progressGoals.reduce((s,g)=>s+(g.progress||0),0)/progressGoals.length) : null;

  // habit completion rate over last 7 days (global) - POPRAWIONE: liczy wszystkie 7 dni
  const last7 = getLastNDates(7);
  let habitDone = 0, habitTotal = 0;
  const habitGoals = goals.filter(g=>g.type==='habitGoal');
  
  // Dla każdego habit goal liczymy WSZYSTKIE 7 dni
  habitGoals.forEach(g=>{
    last7.forEach(d=>{
      habitTotal++; // Każdy dzień się liczy
      if (g.history && g.history[d]) {
        habitDone++; // Tylko jeśli oznaczony jako done
      }
    });
  });
  
  const habitRate = habitTotal > 0 ? Math.round((habitDone / habitTotal) * 100) : null;

  // streaks: active count (current>0), best overall, total fails
  let activeStreaks = 0, bestStreak = 0, totalFails = 0;
  goals.filter(g=>g.type==='streakGoal').forEach(g=>{
    const lastFail = (Array.isArray(g.failDates) && g.failDates.length) ? g.failDates[g.failDates.length-1] : (g.lastFail || null);
    const base = lastFail || (g.startDate || (g.createdAt ? g.createdAt.split('T')[0] : todayStr()));
    const cur = Math.max(0, daysBetween(base, todayStr()));
    if (cur > 0) activeStreaks++;
    
    // Poprawne obliczanie najlepszej serii
    const goalBest = computeBestStreak(g);
    if (goalBest > bestStreak) bestStreak = goalBest;
    
    // Poprawne liczenie failów
    if (Array.isArray(g.failDates)) {
      totalFails += g.failDates.length;
    } else if (g.lastFail) {
      totalFails += 1;
    }
  });

  // days active (since earliest createdAt among goals)
  const createdDates = goals.map(g => g.createdAt).filter(Boolean).map(s => s.split('T')[0]);
  const earliest = createdDates.length ? createdDates.sort()[0] : null;
  const daysActive = earliest ? (daysBetween(earliest, todayStr()) + 1) : 0; // +1 żeby uwzględnić pierwszy dzień

  // upcoming deadlines within next 7 days
  const upcoming = goals
    .filter(g => g.type === 'simpleGoal' && g.deadline && !g.done) // nie pokazuj ukończonych
    .map(g => ({ title: g.title, deadline: g.deadline }))
    .filter(item => {
      const diff = daysBetween(todayStr(), item.deadline);
      return diff >= 0 && diff <= 7;
    })
    .sort((a,b) => a.deadline.localeCompare(b.deadline));

  // top streaks list (by CURRENT streak, not just best)
  const topStreaks = goals
    .filter(g => g.type === 'streakGoal')
    .map(g => {
      const base = g.lastFail || g.startDate || (g.createdAt ? g.createdAt.split('T')[0] : todayStr());
      const current = Math.max(0, daysBetween(base, todayStr()));
      return { 
        title: g.title, 
        current: current,
        best: g.bestStreak || 0 
      };
    })
    .filter(g => g.current > 0) // tylko te z aktualną serią
    .sort((a,b) => b.current - a.current) // sortuj po CURRENT
    .slice(0,5);

  return {
    total, completed, countsByType, avgProgress, habitRate, activeStreaks,
    bestStreak, totalFails, daysActive, upcoming, topStreaks
  };
}

function renderStats() {
  // Sprawdź czy elementy istnieją przed próbą aktualizacji
  const statElements = [
    'statTotal', 'statCompleted', 'statActiveStreaks', 'statBestStreak',
    'statAvgProgress', 'statHabitRate', 'statDaysActive', 'statTotalFails'
  ];
  
  const missingElements = statElements.filter(id => !document.getElementById(id));
  if (missingElements.length > 0) {
    console.warn('Brakujące elementy statystyk:', missingElements);
    return;
  }

  const s = computeStats();
  
  document.getElementById('statTotal').textContent = s.total;
  document.getElementById('statCompleted').textContent = s.completed;
  document.getElementById('statActiveStreaks').textContent = s.activeStreaks;
  document.getElementById('statBestStreak').textContent = s.bestStreak || 0;

  document.getElementById('statAvgProgress').textContent = s.avgProgress === null ? '—' : s.avgProgress + '%';
  document.getElementById('statHabitRate').textContent = s.habitRate === null ? '—' : s.habitRate + '%';
  document.getElementById('statDaysActive').textContent = s.daysActive;
  document.getElementById('statTotalFails').textContent = s.totalFails;

  // upcoming deadlines
  const upEl = document.querySelector('#statUpcomingDeadlines ul');
  if (upEl) {
    upEl.innerHTML = '';
    if (s.upcoming.length === 0) {
      const li = document.createElement('li'); li.textContent = 'Brak w ciągu 7 dni'; upEl.appendChild(li);
    } else {
      s.upcoming.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.title}</span><small>${item.deadline}</small>`;
        upEl.appendChild(li);
      });
    }
  }

  // top streaks
  const topEl = document.querySelector('#statTopStreaks ul');
  if (topEl) {
    topEl.innerHTML = '';
    if (s.topStreaks.length === 0) {
      const li = document.createElement('li'); li.textContent = 'Brak streaków'; topEl.appendChild(li);
    } else {
      s.topStreaks.forEach(t => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${t.title}</span><small>${t.current} dni (best: ${t.best})</small>`;
        topEl.appendChild(li);
      });
    }
  }
}

/* modals open/close */
function openModalBg(bg){ bg.classList.add('open'); bg.setAttribute('aria-hidden','false'); }
function closeModalBg(bg){ bg.classList.remove('open'); bg.setAttribute('aria-hidden','true'); }
function closeAllModals(){ [dom.simpleBg, dom.progressBg, dom.habitBg, dom.streakBg].forEach(bg=>bg&&closeModalBg(bg)); }

/* open modals */
let editSimpleIndex=null, editProgressIndex=null, editHabitIndex=null, editStreakIndex=null;

function openSimpleModal(index=null){
  editSimpleIndex = index;
  refreshCategoriesIn(dom.simpleCategory, index!==null ? goals[index].category : '');
  dom.newSimpleCat.classList.add('hidden');
  if(index===null){ dom.simpleTitle.value=''; dom.simpleDesc.value=''; dom.simpleDeadline.value=''; openModalBg(dom.simpleBg); }
  else { const g=goals[index]; dom.simpleTitle.value=g.title||''; dom.simpleDesc.value=g.desc||''; dom.simpleDeadline.value=g.deadline||''; openModalBg(dom.simpleBg); }
}

function openProgressModal(index=null){
  editProgressIndex = index;
  refreshCategoriesIn(dom.progressCategory, index!==null ? goals[index].category : '');
  dom.newProgressCat.classList.add('hidden');
  if(index===null){ dom.progressTitle.value=''; dom.progressDesc.value=''; dom.progressRange.value=0; dom.progressValue.textContent='0%'; openModalBg(dom.progressBg); }
  else { const g=goals[index]; dom.progressTitle.value=g.title||''; dom.progressDesc.value=g.desc||''; dom.progressRange.value=g.progress||0; dom.progressValue.textContent=(g.progress||0)+'%'; openModalBg(dom.progressBg); }
}

function openHabitModal(index=null){
  editHabitIndex = index;
  refreshCategoriesIn(dom.habitCategory, index!==null ? goals[index].category : '');
  dom.newHabitCat.classList.add('hidden');
  if(index===null){ dom.habitTitle.value=''; dom.habitDesc.value=''; openModalBg(dom.habitBg); }
  else { const g=goals[index]; dom.habitTitle.value=g.title||''; dom.habitDesc.value=g.desc||''; openModalBg(dom.habitBg); }
}

function openStreakModal(index=null){
  editStreakIndex = index;
  refreshCategoriesIn(dom.streakCategory, index!==null ? goals[index].category : '');
  dom.newStreakCat.classList.add('hidden');
  if(index===null){ dom.streakTitle.value=''; dom.streakDesc.value=''; dom.streakStartDate.value=''; openModalBg(dom.streakBg); }
  else { const g=goals[index]; dom.streakTitle.value=g.title||''; dom.streakDesc.value=g.desc||''; dom.streakStartDate.value=g.startDate||''; openModalBg(dom.streakBg); }
}

function openModalForType(type, idx){ if(type==='simpleGoal') openSimpleModal(idx); else if(type==='progressGoal') openProgressModal(idx); else if(type==='habitGoal') openHabitModal(idx); else if(type==='streakGoal') openStreakModal(idx); }

/* category select change handlers */
dom.simpleCategory && dom.simpleCategory.addEventListener('change', ()=>{ if(dom.simpleCategory.value==='__new'){ dom.newSimpleCat.classList.remove('hidden'); dom.newSimpleCat.focus(); } else dom.newSimpleCat.classList.add('hidden'); });
dom.progressCategory && dom.progressCategory.addEventListener('change', ()=>{ if(dom.progressCategory.value==='__new'){ dom.newProgressCat.classList.remove('hidden'); dom.newProgressCat.focus(); } else dom.newProgressCat.classList.add('hidden'); });
dom.habitCategory && dom.habitCategory.addEventListener('change', ()=>{ if(dom.habitCategory.value==='__new'){ dom.newHabitCat.classList.remove('hidden'); dom.newHabitCat.focus(); } else dom.newHabitCat.classList.add('hidden'); });
dom.streakCategory && dom.streakCategory.addEventListener('change', ()=>{ if(dom.streakCategory.value==='__new'){ dom.newStreakCat.classList.remove('hidden'); dom.newStreakCat.focus(); } else dom.newStreakCat.classList.add('hidden'); });

/* save handlers */
dom.saveSimpleBtn && dom.saveSimpleBtn.addEventListener('click', ()=>{
  const title = dom.simpleTitle.value.trim(); const desc = dom.simpleDesc.value.trim();
  let category = dom.simpleCategory.value; if(category==='__new'){ const c=dom.newSimpleCat.value.trim(); if(c){ category=c; if(!categories.includes(c)) categories.push(c);} else category=''; }
  const deadline = dom.simpleDeadline.value || null; if(!title){ alert('Tytuł wymagany'); return; }
  const now = new Date().toISOString();
  if(editSimpleIndex===null){ const obj={ id: genId(), type:'simpleGoal', title, desc, category, deadline, done:false, createdAt:now }; goals.push(obj); }
  else { const g=goals[editSimpleIndex]; g.title=title; g.desc=desc; g.category=category; g.deadline=deadline; }
  save(); closeModalBg(dom.simpleBg); renderAll();
});

dom.progressRange && dom.progressRange.addEventListener('input', ()=>{ dom.progressValue.textContent = dom.progressRange.value + '%'; });
dom.saveProgressBtn && dom.saveProgressBtn.addEventListener('click', ()=>{
  const title = dom.progressTitle.value.trim(); const desc = dom.progressDesc.value.trim();
  let category = dom.progressCategory.value; if(category==='__new'){ const c=dom.newProgressCat.value.trim(); if(c){ category=c; if(!categories.includes(c)) categories.push(c);} else category=''; }
  const progress = parseInt(dom.progressRange.value,10) || 0; if(!title){ alert('Tytuł wymagany'); return; }
  const now = new Date().toISOString();
  if(editProgressIndex===null){ const obj={ id:genId(), type:'progressGoal', title, desc, category, progress, done: progress>=100, createdAt:now }; goals.push(obj); }
  else { const g=goals[editProgressIndex]; g.title=title; g.desc=desc; g.category=category; g.progress=progress; g.done = progress>=100; }
  save(); closeModalBg(dom.progressBg); renderAll();
});

dom.saveHabitBtn && dom.saveHabitBtn.addEventListener('click', ()=>{
  const title = dom.habitTitle.value.trim(); const desc = dom.habitDesc.value.trim();
  let category = dom.habitCategory.value; if(category==='__new'){ const c=dom.newHabitCat.value.trim(); if(c){ category=c; if(!categories.includes(c)) categories.push(c);} else category=''; }
  if(!title){ alert('Tytuł wymagany'); return; }
  const now = new Date().toISOString();
  if(editHabitIndex===null){ const obj={ id:genId(), type:'habitGoal', title, desc, category, history:{}, createdAt:now }; goals.push(obj); }
  else { const g=goals[editHabitIndex]; g.title=title; g.desc=desc; g.category=category; }
  save(); closeModalBg(dom.habitBg); renderAll();
});

dom.saveStreakBtn && dom.saveStreakBtn.addEventListener('click', ()=>{
  const title = dom.streakTitle.value.trim(); const desc = dom.streakDesc.value.trim();
  let category = dom.streakCategory.value; if(category==='__new'){ const c=dom.newStreakCat.value.trim(); if(c){ category=c; if(!categories.includes(c)) categories.push(c);} else category=''; }
  const start = dom.streakStartDate.value || todayStr();
  if(!title){ alert('Tytuł wymagany'); return; }
  const now = new Date().toISOString();
  if(editStreakIndex===null){ 
    const obj={ 
      id:genId(), 
      type:'streakGoal', 
      title, 
      desc, 
      category, 
      startDate:start, 
      lastFail:null, 
      bestStreak:0, 
      failDates:[], // Inicjalizacja tablicy failDates
      createdAt:now 
    }; 
    goals.push(obj); 
  } else { 
    const g=goals[editStreakIndex]; 
    g.title=title; 
    g.desc=desc; 
    g.category=category; 
    g.startDate=start; 
    // Upewnij się, że failDates istnieje
    if (!Array.isArray(g.failDates)) {
      g.failDates = [];
    }
  }
  save(); closeModalBg(dom.streakBg); renderAll();
});

/* close modals by clicking background */
[dom.simpleBg, dom.progressBg, dom.habitBg, dom.streakBg].forEach(bg=>{ if(!bg) return; bg.addEventListener('click', (e)=>{ if(e.target===bg) closeModalBg(bg); }); });

/* ========== SEARCH & FILTER EVENT LISTENERS ========== */
function setupSearchAndFilters() {
  // Search input
  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', (e) => {
      currentFilters.search = e.target.value;
      applyFiltersAndSort();
    });
  }
  
  // Clear search button
  if (dom.clearSearchBtn) {
    dom.clearSearchBtn.addEventListener('click', () => {
      dom.searchInput.value = '';
      currentFilters.search = '';
      applyFiltersAndSort();
    });
  }
  
  // Type filter
  if (dom.typeFilter) {
    dom.typeFilter.addEventListener('change', (e) => {
      currentFilters.type = e.target.value;
      applyFiltersAndSort();
    });
  }
  
  // Category filter
  if (dom.categoryFilter) {
    dom.categoryFilter.addEventListener('change', (e) => {
      currentFilters.category = e.target.value;
      applyFiltersAndSort();
    });
  }
  
  // Status filter
  if (dom.statusFilter) {
    dom.statusFilter.addEventListener('change', (e) => {
      currentFilters.status = e.target.value;
      applyFiltersAndSort();
    });
  }
  
  // Sort filter
  if (dom.sortFilter) {
    dom.sortFilter.addEventListener('change', (e) => {
      currentFilters.sort = e.target.value;
      applyFiltersAndSort();
    });
  }
  
  // Clear filters button
  if (dom.clearFiltersBtn) {
    dom.clearFiltersBtn.addEventListener('click', clearAllFilters);
  }
}

/* init */
async function init(){
  await load(); 
  setupSearchAndFilters();
  setupCollapsibleControls();
  renderAll();
  
  // Auto-sync check on app start
  if (isOnline) {
    syncPendingChanges();
  }
  
  dom.logoutBtn && dom.logoutBtn.addEventListener('click', async ()=>{ 
    if(confirm('Wylogować i wyczyścić dane lokalne?')){ 
      try {
        // Clear API data (implement this endpoint if needed)
        // await apiRequest('/clear', { method: 'POST' });
        localStorage.clear(); 
        location.reload(); 
      } catch (error) {
        console.error('Logout error:', error);
        localStorage.clear(); 
        location.reload();
      }
    } 
  });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();