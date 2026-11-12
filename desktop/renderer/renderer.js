const $ = id => document.getElementById(id);

let snapshot = { connected:false, playing:false, queue:[], index:0, total:0 };
let activeItemKey = '';
let hasPainted = false;

function normalizeIndex(state) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const value = Number(state.index) || 0;
  return Math.max(0, Math.min(value, Math.max(0, queue.length - 1)));
}

function updateStatus(state) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const index = normalizeIndex(state);

  $('ticker').classList.toggle('playing', !!state.connected && !!state.playing);
  $('status').textContent = !state.connected
    ? '等待网页连接'
    : state.playing ? '正在播放' : '已连接 · 已暂停';
  $('liveDot').title = state.playing ? '正在播放' : '已暂停';
  $('progress').textContent = state.total
    ? (Number(state.index || 0) + 1) + ' / ' + state.total
    : (queue.length ? (index + 1) + ' / ' + queue.length : '');
}

function paintItem(state, animate) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const index = normalizeIndex(state);
  const item = queue[index] || state;
  const word = String(item.word || state.word || '').trim();
  const meaning = String(item.meaning || state.meaning || '').trim();
  const key = index + '|' + word.toLocaleLowerCase() + '|' + meaning;

  if (key === activeItemKey) return;
  activeItemKey = key;

  const pair = $('wordPair');
  pair.classList.remove('entering');
  $('currentWord').textContent = word || 'Ready?';
  $('currentMeaning').textContent = meaning;
  $('pairDivider').hidden = !(word && meaning);

  if (animate && hasPainted && word) {
    void pair.offsetWidth;
    pair.classList.add('entering');
  }
  hasPainted = true;
}

function render(state) {
  snapshot = { ...snapshot, ...state };
  if (Array.isArray(state.queue)) snapshot.queue = state.queue;

  updateStatus(snapshot);

  // The companion is intentionally word-only. Audio segment changes
  // (word / definition / example) never replace the displayed word.
  // Both the English word and Chinese meaning come from the same queue item.
  paintItem(snapshot, true);
}

window.companion.onState(render);
window.companion.onError(message => { $('status').textContent = message; });
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });
