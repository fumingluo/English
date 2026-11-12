const $ = id => document.getElementById(id);
let snapshot = { connected:false, playing:false, queue:[], index:0, total:0 };
let lastIndex = null;
let animationTimer = null;
let pendingState = null;

function rowText(item) {
  if (!item) return '';
  return String(item.word || item.segment || item.text || '').trim();
}
function renderRows(state, animate = false) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const index = Math.max(0, Math.min(Number(state.index) || 0, Math.max(0, queue.length - 1)));
  const word = queue[index] || state;
  const spoken = String(state.segment || '').trim();
  const currentText = spoken || rowText(word) || 'Ready?';
  let meaning = String(state.segmentZh || '').trim();
  if (!meaning) {
    if (spoken && spoken === String(word.meaning || '').trim()) meaning = rowText(word);
    else meaning = String(word.meaning || '');
  }

  if (animate && lastIndex !== null && index !== lastIndex) {
    if (animationTimer) clearTimeout(animationTimer);
    pendingState = state;
    $('lyricTrack').classList.remove('advance');
    void $('lyricTrack').offsetWidth;
    $('lyricTrack').classList.add('advance');
    animationTimer = setTimeout(() => {
      $('lyricTrack').classList.remove('advance');
      paintRows(pendingState || state, false);
      pendingState = null;
      animationTimer = null;
    }, 380);
  } else {
    paintRows(state, false);
  }
  lastIndex = index;
  $('ticker').classList.toggle('playing', !!state.connected && !!state.playing);
  $('status').textContent = !state.connected
    ? '等待网页连接'
    : state.playing ? '网页正在播放' : '已连接 · 网页已暂停';
  $('liveDot').title = state.playing ? '网页正在播放' : '网页已暂停';
  $('progress').textContent = state.total
    ? (Number(state.index || 0) + 1) + ' / ' + state.total
    : (queue.length ? (index + 1) + ' / ' + queue.length : '');
  $('currentWord').title = currentText;
  $('currentMeaning').title = meaning;
}
function paintRows(state) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const index = Math.max(0, Math.min(Number(state.index) || 0, Math.max(0, queue.length - 1)));
  const word = queue[index] || state;
  const spoken = String(state.segment || '').trim();
  const currentText = spoken || rowText(word) || 'Ready?';
  let meaning = String(state.segmentZh || '').trim();
  if (!meaning) {
    if (spoken && spoken === String(word.meaning || '').trim()) meaning = rowText(word);
    else meaning = String(word.meaning || '');
  }
  const indices = [index - 2, index - 1, index, index + 1, index + 2];
  indices.forEach((queueIndex, slot) => {
    const el = $('row' + slot);
    if (slot === 2) {
      $('currentWord').textContent = currentText;
      $('currentMeaning').textContent = meaning;
      return;
    }
    const item = queue[queueIndex];
    el.textContent = rowText(item);
    el.title = rowText(item);
  });
}
function render(state) {
  snapshot = { ...snapshot, ...state };
  if (Array.isArray(state.queue)) snapshot.queue = state.queue;
  renderRows(snapshot, true);
}

window.companion.onState(render);
window.companion.onError(message => { $('status').textContent = message; });
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });
