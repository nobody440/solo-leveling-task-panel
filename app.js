const STORAGE_KEY = 'ascend-quest-panel-v1';
const icons = { Mind: '⌘', Body: '↗', Discipline: '◈', Life: '✧' };
const initialQuests = [
  { id: 'water', title: 'Drink a full glass of water', category: 'Body', xp: 10, done: false },
  { id: 'move', title: 'Move your body for 20 minutes', category: 'Body', xp: 20, done: false },
  { id: 'focus', title: 'Focus on your most important task', category: 'Discipline', xp: 30, done: false },
  { id: 'read', title: 'Read or learn something new', category: 'Mind', xp: 20, done: false }
];
const $ = (selector) => document.querySelector(selector);
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const today = localDate();
let state = loadState();
let toastTimer;
let oathStep = 0;

function defaultState() {
  return {
    quests: initialQuests.map((quest) => ({ ...quest })),
    xp: 0,
    streak: 0,
    lastCompletedDate: '',
    player: 'Shadow Hunter',
    oath: null,
    date: today
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaultState();
    const loaded = {
      ...defaultState(),
      ...saved,
      quests: Array.isArray(saved.quests) ? saved.quests : initialQuests.map((quest) => ({ ...quest }))
    };
    if (loaded.date !== today) {
      loaded.quests = loaded.quests.map((quest) => ({ ...quest, done: false }));
      loaded.date = today;
    }
    return loaded;
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const list = $('#quest-list');
  list.replaceChildren();
  const done = state.quests.filter((quest) => quest.done).length;
  const total = state.quests.length;
  $('#done-count').textContent = done;
  $('#total-count').textContent = total;
  $('#section-count').textContent = total;
  $('#nav-count').textContent = `${done}/${total}`;
  $('#empty-state').hidden = total !== 0;

  state.quests.forEach((quest) => {
    const card = document.createElement('article');
    card.className = `quest-card${quest.done ? ' completed' : ''}`;
    const check = document.createElement('button');
    check.className = 'quest-check';
    check.type = 'button';
    check.setAttribute('aria-label', `${quest.done ? 'Mark incomplete' : 'Complete'} ${quest.title}`);
    check.textContent = '✓';
    check.addEventListener('click', () => toggleQuest(quest.id));

    const icon = document.createElement('div');
    icon.className = 'quest-icon';
    icon.textContent = icons[quest.category] || '✧';
    const main = document.createElement('div');
    main.className = 'quest-main';
    const title = document.createElement('p');
    title.className = 'quest-title';
    title.textContent = quest.title;
    const meta = document.createElement('div');
    meta.className = 'quest-meta';
    const tag = document.createElement('span');
    tag.className = 'category-tag';
    tag.textContent = quest.category;
    const hint = document.createElement('span');
    hint.textContent = quest.done ? 'Cleared' : quest.kind === 'trial' ? 'First trial' : quest.kind === 'vow' ? 'Daily vow' : 'Daily quest';
    meta.append(tag, hint);
    main.append(title, meta);

    const reward = document.createElement('span');
    reward.className = 'quest-reward';
    reward.textContent = `✦ ${quest.xp} XP`;
    const remove = document.createElement('button');
    remove.className = 'delete-quest';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete ${quest.title}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      state.quests = state.quests.filter((item) => item.id !== quest.id);
      saveState();
      render();
    });
    card.append(check, icon, main, reward, remove);
    list.append(card);
  });

  const level = Math.floor(state.xp / 100) + 1;
  const levelXp = state.xp % 100;
  $('#level').textContent = String(level).padStart(2, '0');
  $('#xp-label').textContent = `${levelXp} / 100 XP`;
  $('#xp-bar').style.width = `${levelXp}%`;
  $('#streak-count').textContent = state.streak || 0;
  $('#player-name').textContent = state.player || 'Shadow Hunter';
  $('.avatar').textContent = (state.player || 'S').trim().charAt(0).toUpperCase() || 'S';
  $('#today-date').textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  }).format(new Date());

  const oath = state.oath;
  if (oath) {
    $('.rank-badge').textContent = oath.rank;
    $('.reward-card h3').innerHTML = `${oath.rank === 'D' ? 'Awakened' : 'Hunter'} <span>·</span> Rank ${oath.rank}`;
    $('.rank-progress').textContent = oath.mission.toUpperCase();
    $('#hero-title').textContent = total > 0 && done === total ? 'All vows fulfilled. You have risen.' : oath.mission;
    $('#hero-subtitle').textContent = total > 0 && done === total
      ? 'A promise kept is power earned. Be proud.'
      : 'Honor your oath, one trial at a time.';
  } else {
    $('#hero-title').textContent = total > 0 && done === total ? 'All quests cleared. You rose.' : 'A new day. A new ascent.';
    $('#hero-subtitle').textContent = total > 0 && done === total
      ? 'A promise kept is power earned. Be proud.'
      : 'Show up for yourself. The rest will follow.';
  }
}

function toggleQuest(id) {
  const quest = state.quests.find((item) => item.id === id);
  if (!quest) return;
  quest.done = !quest.done;
  if (quest.done) {
    state.xp += quest.xp;
    if (state.lastCompletedDate !== today) {
      state.streak = (state.streak || 0) + 1;
      state.lastCompletedDate = today;
    }
    showToast(`Trial cleared · +${quest.xp} XP`);
  } else {
    state.xp = Math.max(0, state.xp - quest.xp);
  }
  saveState();
  render();
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function populateOathForm() {
  const oath = state.oath;
  $('#oath-name').value = oath?.name || state.player || '';
  $('#oath-mission').value = oath?.mission || '';
  $('.vow-input[name="vow1"]').value = oath?.vows?.[0] || '';
  $('.vow-input[name="vow2"]').value = oath?.vows?.[1] || '';
  $('.vow-input[name="vow3"]').value = oath?.vows?.[2] || '';
  $('.vow-input[name="vow4"]').value = oath?.vows?.[3] || '';
  $('.vow-input[name="vow5"]').value = oath?.vows?.[4] || '';
  $('#oath-trial').value = oath?.trial || '';
  document.querySelectorAll('input[name="discipline"]').forEach((input) => {
    input.checked = input.value === oath?.discipline;
  });
  document.querySelectorAll('input[name="rank"]').forEach((input) => {
    input.checked = input.value === oath?.rank;
  });
}

function showOathStep(index) {
  oathStep = Math.max(0, Math.min(5, index));
  document.querySelectorAll('.oath-step').forEach((step, stepIndex) => {
    const active = stepIndex === oathStep;
    step.hidden = !active;
    step.classList.toggle('is-active', active);
  });
  $('#oath-step-label').textContent = `TRIAL ${String(oathStep + 1).padStart(2, '0')} / 06`;
  $('#oath-progress-fill').style.width = `${((oathStep + 1) / 6) * 100}%`;
  $('#oath-back').hidden = oathStep === 0;
  $('#oath-next').hidden = oathStep === 5;
  $('#oath-submit').hidden = oathStep !== 5;
  $('#oath-title').textContent = state.oath ? 'Alter thy oath.' : 'Awaken, Hunter.';
}

function openOathPanel() {
  populateOathForm();
  showOathStep(0);
  $('#oath-dialog').showModal();
  document.body.classList.add('oath-open');
  $('#oath-name').focus();
}

function currentStepIsValid() {
  const step = document.querySelector(`.oath-step[data-step="${oathStep}"]`);
  const fields = [...step.querySelectorAll('input, select')];
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      field.focus();
      return false;
    }
  }
  return true;
}

function createOathQuests(oath) {
  const oldByTitle = new Map(state.quests.map((quest) => [quest.title.trim().toLowerCase(), quest]));
  const vows = oath.vows.map((title, index) => {
    const previous = oldByTitle.get(title.toLowerCase());
    return {
      id: previous?.id || `vow-${index + 1}-${Date.now()}`,
      title,
      category: oath.discipline,
      xp: previous?.xp || 10,
      done: previous?.done || false,
      kind: 'vow'
    };
  });
  const previousTrial = oldByTitle.get(oath.trial.toLowerCase());
  const trial = {
    id: previousTrial?.id || `trial-${Date.now()}`,
    title: oath.trial,
    category: oath.discipline,
    xp: previousTrial?.xp || 30,
    done: previousTrial?.done || false,
    kind: 'trial'
  };
  const defaultQuestIds = new Set(['water', 'move', 'focus', 'read']);
  const customQuests = state.quests.filter((quest) =>
    !defaultQuestIds.has(quest.id) && quest.kind !== 'vow' && quest.kind !== 'trial'
  );
  return [...vows, trial, ...customQuests];
}

$('#add-quest').addEventListener('click', () => {
  $('#quest-dialog').showModal();
  $('#quest-title').focus();
});

$('#quest-form').addEventListener('submit', (event) => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  const title = $('#quest-title').value.trim();
  if (!title) return;
  state.quests.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title,
    category: $('#quest-category').value,
    xp: Number($('#quest-xp').value),
    done: false
  });
  saveState();
  render();
  $('#quest-dialog').close();
  $('#quest-form').reset();
  showToast('A new trial has been added.');
});

$('#reset-day').addEventListener('click', () => {
  if (!state.quests.some((quest) => quest.done)) {
    showToast('No completed trials to reset.');
    return;
  }
  state.quests.forEach((quest) => { quest.done = false; });
  saveState();
  render();
  showToast('Your trials are ready again.');
});

$('#edit-name').addEventListener('click', openOathPanel);
$('#oath-next').addEventListener('click', () => {
  if (currentStepIsValid()) showOathStep(oathStep + 1);
});
$('#oath-back').addEventListener('click', () => showOathStep(oathStep - 1));
$('#oath-dialog').addEventListener('cancel', (event) => {
  if (!state.oath) event.preventDefault();
});
$('#oath-dialog').addEventListener('close', () => {
  document.body.classList.remove('oath-open');
});
$('#oath-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!currentStepIsValid()) return;
  const isFirstOath = !state.oath;
  const form = new FormData(event.currentTarget);
  const vows = [1, 2, 3, 4, 5].map((number) => String(form.get(`vow${number}`) || '').trim());
  const oath = {
    name: String(form.get('hunterName') || '').trim().slice(0, 28),
    mission: String(form.get('mission') || '').trim(),
    vows,
    discipline: String(form.get('discipline') || 'Discipline'),
    trial: String(form.get('trial') || '').trim(),
    rank: String(form.get('rank') || 'E')
  };
  state.player = oath.name;
  state.oath = oath;
  state.quests = createOathQuests(oath);
  saveState();
  render();
  $('#oath-dialog').close();
  showToast(isFirstOath ? 'Hunter registration complete.' : 'Your oath has been inscribed.');
});

$('#settings-button').addEventListener('click', () => {
  document.body.classList.toggle('focus-mode');
  showToast(document.body.classList.contains('focus-mode') ? 'Focus mode enabled.' : 'Focus mode disabled.');
});

render();
if (!state.oath) openOathPanel();

  
