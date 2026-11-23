const STORAGE_KEY = 'ascend-quest-panel-v1';
const icons = { Mind: '⌘', Body: '↗', Discipline: '◈', Life: '✧' };
const initialQuests = [
  { id: 'water', title: 'Drink a full glass of water', category: 'Body', xp: 10, done: false },
  { id: 'move', title: 'Move your body for 20 minutes', category: 'Body', xp: 20, done: false },
  { id: 'focus', title: 'Focus on your most important task', category: 'Discipline', xp: 30, done: false },
  { id: 'read', title: 'Read or learn something new', category: 'Mind', xp: 20, done: false }
];
const $ = (selector) => document.querySelector(selector);
const today = new Date().toISOString().slice(0, 10);
let state = loadState();
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return { quests: initialQuests, xp: 0, streak: 0, lastCompletedDate: '', player: 'Shadow Hunter', date: today };
    if (saved.date !== today) return { ...saved, quests: saved.quests.map(q => ({ ...q, done: false })), date: today };
    return saved;
  } catch {
    return { quests: initialQuests, xp: 0, streak: 0, lastCompletedDate: '', player: 'Shadow Hunter', date: today };
  }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function render() {
  const list = $('#quest-list');
  list.replaceChildren();
  const done = state.quests.filter(q => q.done).length;
  const total = state.quests.length;
  $('#done-count').textContent = done;
  $('#total-count').textContent = total;
  $('#section-count').textContent = total;
  $('#nav-count').textContent = `${done}/${total}`;
  $('#empty-state').hidden = total !== 0;
  state.quests.forEach(quest => {
    const card = document.createElement('article');
    card.className = `quest-card${quest.done ? ' completed' : ''}`;
    const check = document.createElement('button');
    check.className = 'quest-check'; check.type = 'button'; check.setAttribute('aria-label', `${quest.done ? 'Mark incomplete' : 'Complete'} ${quest.title}`); check.textContent = '✓';
    check.addEventListener('click', () => toggleQuest(quest.id));
    const icon = document.createElement('div'); icon.className = 'quest-icon'; icon.textContent = icons[quest.category] || '✧';
    const main = document.createElement('div'); main.className = 'quest-main';
    const title = document.createElement('p'); title.className = 'quest-title'; title.textContent = quest.title;
    const meta = document.createElement('div'); meta.className = 'quest-meta';
    const tag = document.createElement('span'); tag.className = 'category-tag'; tag.textContent = quest.category;
    const hint = document.createElement('span'); hint.textContent = quest.done ? 'Cleared' : 'Daily quest';
    meta.append(tag, hint); main.append(title, meta);
    const reward = document.createElement('span'); reward.className = 'quest-reward'; reward.textContent = `✦ ${quest.xp} XP`;
    const remove = document.createElement('button'); remove.className = 'delete-quest'; remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${quest.title}`); remove.textContent = '×';
    remove.addEventListener('click', () => { state.quests = state.quests.filter(q => q.id !== quest.id); saveState(); render(); });
    card.append(check, icon, main, reward, remove); list.append(card);
  });
  const level = Math.floor(state.xp / 100) + 1;
  const levelXp = state.xp % 100;
  $('#level').textContent = String(level).padStart(2, '0');
  $('#xp-label').textContent = `${levelXp} / 100 XP`;
  $('#xp-bar').style.width = `${levelXp}%`;
  $('#streak-count').textContent = state.streak || 0;
  $('#player-name').textContent = state.player || 'Shadow Hunter';
  $('#today-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  if (total > 0 && done === total) { $('#hero-title').textContent = 'All quests cleared. You rose.'; $('#hero-subtitle').textContent = 'A promise kept is power earned. Be proud.'; }
  else { $('#hero-title').textContent = 'A new day. A new ascent.'; $('#hero-subtitle').textContent = 'Show up for yourself. The rest will follow.'; }
}
function toggleQuest(id) {
  const quest = state.quests.find(q => q.id === id);
  if (!quest) return;
  quest.done = !quest.done;
  if (quest.done) {
    state.xp += quest.xp;
    if (state.lastCompletedDate !== today) { state.streak = (state.streak || 0) + 1; state.lastCompletedDate = today; }
    showToast(`Quest cleared · +${quest.xp} XP`);
  } else { state.xp = Math.max(0, state.xp - quest.xp); }
  saveState(); render();
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
$('#add-quest').addEventListener('click', () => { $('#quest-dialog').showModal(); $('#quest-title').focus(); });
$('#quest-form').addEventListener('submit', event => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  const title = $('#quest-title').value.trim();
  if (!title) return;
  state.quests.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title, category: $('#quest-category').value, xp: Number($('#quest-xp').value), done: false });
  saveState(); render(); $('#quest-dialog').close(); $('#quest-form').reset(); showToast('New quest added to your board.');
});
$('#reset-day').addEventListener('click', () => {
  if (!state.quests.some(q => q.done)) { showToast('No completed quests to reset.'); return; }
  state.quests.forEach(q => q.done = false); saveState(); render(); showToast('Today’s quests are ready again.');
});
$('#edit-name').addEventListener('click', () => {
  const name = window.prompt('Choose your player name:', state.player || 'Shadow Hunter');
  if (name?.trim()) { state.player = name.trim().slice(0, 28); saveState(); render(); }
});
$('#settings-button').addEventListener('click', () => { document.body.classList.toggle('focus-mode'); showToast(document.body.classList.contains('focus-mode') ? 'Focus mode enabled.' : 'Focus mode disabled.'); });
render();
