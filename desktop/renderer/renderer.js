const $ = id => document.getElementById(id);

const track = $('lyricTrack');
const rows = Array.from(track.querySelectorAll('.lyric-row'));
const ROLL_DURATION = 780;
const ROW_HEIGHT = 34;

let snapshot = { connected:false, playing:false, queue:[], index:0, total:0 };
let activeItemKey = '';
let lastIndex = null;
let rolling = false;
let rollingDirection = 1;
let rollTimer = null;

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

function keyAt(state, index) {
  const item = itemAt(state, index) || {};
  return index + '|' + String(item.word || '').toLocaleLowerCase() + '|' + String(item.meaning || '');
}

function depthFor(offset) {
  const distance = Math.abs(offset);
  if (distance === 0) return { z: 58, scale: 1.08, opacity: 1, blur: 0 };
  if (distance === 1) return { z: -28, scale: .88, opacity: .66, blur: .12 };
  if (distance === 2) return { z: -118, scale: .67, opacity: .24, blur: .62 };
  if (distance === 3) return { z: -210, scale: .48, opacity: .035, blur: 1.35 };
  return { z: -270, scale: .36, opacity: 0, blur: 2 };
}

function setRowOffset(row, offset) {
  const depth = depthFor(offset);
  row.dataset.offset = String(offset);
  row.classList.toggle('current', offset === 0);
  row.classList.toggle('adjacent', Math.abs(offset) === 1);
  row.classList.toggle('edge', Math.abs(offset) === 2);
  row.classList.toggle('far', Math.abs(offset) >= 3);
  row.style.setProperty('--row-y', (offset * ROW_HEIGHT) + 'px');
  row.style.setProperty('--row-z', depth.z + 'px');
  row.style.setProperty('--row-scale', String(depth.scale));
  row.style.setProperty('--row-opacity', String(depth.opacity));
  row.style.setProperty('--row-blur', depth.blur + 'px');
}

function writeRow(row, state, index) {
  const item = itemAt(state, index);
  const word = item?.word || '';
  const meaning = item?.meaning || '';
  const content = row.querySelector('.row-content');
  const wordNode = row.querySelector('.row-word');
  const meaningNode = row.querySelector('.row-meaning');

  wordNode.textContent = word;
  meaningNode.textContent = meaning;
  meaningNode.hidden = !meaning;
  row.classList.toggle('empty', !word && !meaning);

  // Keep full words and translations visible; shrink only when the pair is too wide.
  content.style.fontSize = '20px';
  const available = Math.max(100, row.clientWidth - 36);
  const measured = content.scrollWidth;
  if (measured > available) {
    content.style.fontSize = Math.max(10, 20 * available / measured) + 'px';
  }
}

function paintRows(state) {
  const center = normalizeIndex(state);
  for (const row of rows) {
    row.style.transition = 'none';
    const offset = Number(row.dataset.offset || 0);
    setRowOffset(row, offset);
    writeRow(row, state, center + offset);
  }
  void track.offsetWidth;
  for (const row of rows) row.style.transition = '';
  activeItemKey = keyAt(state, center);
  lastIndex = center;
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

function finishRollStep() {
  if (!rolling) return;
  const nextCenter = lastIndex + rollingDirection;
  const leavingOffset = rollingDirection > 0 ? -4 : 4;
  const enteringOffset = rollingDirection > 0 ? 3 : -3;
  const recycled = rows.find(row => Number(row.dataset.offset) === leavingOffset);

  // The leaving row is already completely outside the masked viewport.
  // Recycle it at the opposite edge while invisible; the six moving rows never reset.
  track.classList.remove('rolling');
  if (recycled) {
    recycled.style.transition = 'none';
    writeRow(recycled, snapshot, nextCenter + enteringOffset);
    setRowOffset(recycled, enteringOffset);
    void recycled.offsetWidth;
    recycled.style.transition = '';
  }

  lastIndex = nextCenter;
  activeItemKey = keyAt(snapshot, lastIndex);
  rolling = false;
  rollTimer = null;

  const desiredIndex = normalizeIndex(snapshot);
  if (desiredIndex !== lastIndex) {
    rollOneStep(Math.sign(desiredIndex - lastIndex));
  }
}

function rollOneStep(direction) {
  if (!direction || rolling || lastIndex === null) return;
  rolling = true;
  rollingDirection = direction;
  track.classList.add('rolling');

  requestAnimationFrame(() => {
    for (const row of rows) {
      const oldOffset = Number(row.dataset.offset || 0);
      setRowOffset(row, oldOffset - direction);
    }
    rollTimer = setTimeout(finishRollStep, ROLL_DURATION + 35);
  });
}

function render(state) {
  snapshot = { ...snapshot, ...state };
  if (Array.isArray(state.queue)) snapshot.queue = state.queue;
  updateStatus(snapshot);

  if (rolling) return;

  const nextIndex = normalizeIndex(snapshot);
  const nextKey = keyAt(snapshot, nextIndex);

  if (lastIndex === null) {
    paintRows(snapshot);
    return;
  }
  if (nextIndex !== lastIndex) {
    rollOneStep(Math.sign(nextIndex - lastIndex));
    return;
  }
  if (nextKey !== activeItemKey) paintRows(snapshot);
}

window.companion.onState(render);
window.companion.onError(message => { $('status').textContent = message; });
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });