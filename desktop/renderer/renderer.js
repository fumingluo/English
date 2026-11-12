const $ = id => document.getElementById(id);

let snapshot = { connected:false, playing:false, queue:[], index:0, total:0 };
let activeItemKey = '';
let lastIndex = null;
let animationTimer = null;
let pendingState = null;

function normalizeIndex(state) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const value = Number(state.index) || 0;
  return Math.max(0, Math.min(value, Math.max(0, queue.length - 1)));
}

function itemAt(state, index) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const item = queue[index] || (index === normalizeIndex(state) ? state : null);
  if (!item) return null;
  return {
    word: String(item.word || item.segment || item.text || '').trim(),
    meaning: String(item.meaning || item.translation || '').trim()
  };
}

function paintRows(state) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const index = normalizeIndex(state);
  for (let slot = 0; slot < 5; slot++) {
    const row = $('row' + slot);
    const content = row.querySelector('.row-content');
    const wordNode = row.querySelector('.row-word');
    const meaningNode = row.querySelector('.row-meaning');
    const item = itemAt(state, index + slot - 2);
    const word = item?.word || '';
    const meaning = item?.meaning || '';
    wordNode.textContent = word;
    meaningNode.textContent = meaning;
    meaningNode.hidden = !meaning;
    row.classList.toggle('empty', !word && !meaning);

    // Fit long vocabulary phrases without adding ellipses or clipping their text.
    content.style.fontSize = '20px';
    const available = Math.max(120, row.clientWidth - (slot === 2 ? 42 : 24));
    const measured = content.scrollWidth;
    if (measured > available) {
      content.style.fontSize = Math.max(11, 20 * available / measured) + 'px';
    }
  }
  activeItemKey = itemKey(state);
  lastIndex = index;
}

function itemKey(state) {
  const item = itemAt(state, normalizeIndex(state)) || {};
  return normalizeIndex(state) + '|' + item.word.toLocaleLowerCase() + '|' + item.meaning;
}

function updateStatus(state) {
  $('ticker').classList.toggle('playing', !!state.connected && !!state.playing);
  $('status').textContent = !state.connected
    ? '等待网页连接'
    : state.playing ? '正在播放' : '已连接 · 已暂停';
  $('liveDot').title = state.playing ? '正在播放' : '已暂停';
  $('progress').textContent = state.total
    ? (Number(state.index || 0) + 1) + ' / ' + state.total
    : (state.queue.length ? (normalizeIndex(state) + 1) + ' / ' + state.queue.length : '');
}

function render(state) {
  snapshot = { ...snapshot, ...state };
  if (Array.isArray(state.queue)) snapshot.queue = state.queue;
  updateStatus(snapshot);

  const nextIndex = normalizeIndex(snapshot);
  const nextKey = itemKey(snapshot);

  // Never follow audio sub-segments: word, definition and example audio all
  // belong to the same queue item, so the displayed word/translation stay paired.
  if (animationTimer) {
    pendingState = snapshot;
    return;
  }

  if (lastIndex !== null && nextIndex !== lastIndex && activeItemKey) {
    pendingState = snapshot;
    const track = $('lyricTrack');
    track.classList.remove('advance');
    void track.offsetWidth;
    track.classList.add('advance');
    animationTimer = setTimeout(() => {
      track.classList.remove('advance');
      paintRows(pendingState || snapshot);
      pendingState = null;
      animationTimer = null;
    }, 680);
    return;
  }

  if (nextKey !== activeItemKey) paintRows(snapshot);
}

window.companion.onState(render);
window.companion.onError(message => { $('status').textContent = message; });
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });