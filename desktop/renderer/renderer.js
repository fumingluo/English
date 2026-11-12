const $ = id => document.getElementById(id);

let snapshot = { connected:false, playing:false, queue:[], index:0, total:0 };
let activeEvent = null;
let stagedEvent = null;
let pendingEvent = null;
let lastEventKey = '';
let transitionTimer = null;
let previousPlaying = false;

const TRANSITION_MS = 520;

function rowText(item) {
  if (!item) return '';
  return String(item.word || item.segment || item.text || '').trim();
}

function getIndex(state) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  return Math.max(0, Math.min(Number(state.index) || 0, Math.max(0, queue.length - 1)));
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function segmentBelongsToItem(segment, item) {
  if (!segment || !item) return false;
  const candidate = normalize(segment);
  return [item.word, item.example, item.meaning]
    .some(value => normalize(value) === candidate);
}

function paintRows(state, segment, segmentZh) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const index = getIndex(state);
  const word = queue[index] || state;
  const currentText = String(segment || rowText(word) || 'Ready?').trim();
  const meaning = String(segmentZh || word.exampleZh || word.meaning || '').trim();

  [index - 2, index - 1, index, index + 1, index + 2].forEach((queueIndex, slot) => {
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

  $('currentWord').title = currentText;
  $('currentMeaning').title = meaning;
}

function updateStatus(state) {
  const queue = Array.isArray(state.queue) ? state.queue : [];
  const index = getIndex(state);

  $('ticker').classList.toggle('playing', !!state.connected && !!state.playing);
  $('status').textContent = !state.connected
    ? '等待网页连接'
    : state.playing ? '网页正在播放' : '已连接 · 网页已暂停';
  $('liveDot').title = state.playing ? '网页正在播放' : '网页已暂停';
  $('progress').textContent = state.total
    ? (Number(state.index || 0) + 1) + ' / ' + state.total
    : (queue.length ? (index + 1) + ' / ' + queue.length : '');
}

function finishTransition() {
  if (!transitionTimer) return;

  clearTimeout(transitionTimer);
  transitionTimer = null;

  $('lyricTrack').classList.remove('advance');

  // Commit exactly the phrase that was staged into the moving lower row.
  // A newer phrase may be pending, but it must get its own complete glide.
  if (stagedEvent) {
    activeEvent = stagedEvent;
    stagedEvent = null;
    paintRows(activeEvent.state, activeEvent.segment, activeEvent.segmentZh);
  }

  startNextTransition();
}

function startNextTransition() {
  if (transitionTimer || !pendingEvent) return;

  const next = pendingEvent;
  pendingEvent = null;

  if (!activeEvent) {
    activeEvent = next;
    paintRows(next.state, next.segment, next.segmentZh);
    return;
  }

  stagedEvent = next;
  const nextRow = $('row3');
  nextRow.textContent = stagedEvent.segment;
  nextRow.title = stagedEvent.segment;

  const track = $('lyricTrack');
  track.classList.remove('advance');
  void track.offsetWidth;
  track.classList.add('advance');

  transitionTimer = setTimeout(finishTransition, TRANSITION_MS + 80);
}

function render(state) {
  snapshot = { ...snapshot, ...state };
  if (Array.isArray(state.queue)) snapshot.queue = state.queue;
  updateStatus(snapshot);

  const index = getIndex(snapshot);
  const queue = Array.isArray(snapshot.queue) ? snapshot.queue : [];
  const item = queue[index] || snapshot;
  const segment = String(snapshot.segment || '').trim();

  if (!snapshot.playing && previousPlaying) {
    lastEventKey = '';
    pendingEvent = null;
  }
  previousPlaying = !!snapshot.playing;

  if (segment && segmentBelongsToItem(segment, item)) {
    const key = index + '|' + normalize(segment);

    if (key !== lastEventKey) {
      lastEventKey = key;
      pendingEvent = {
        key,
        state: { ...snapshot, queue: [...queue] },
        segment,
        segmentZh: String(snapshot.segmentZh || '').trim()
      };
      startNextTransition();
    }
  }

  if (!activeEvent && !transitionTimer && !pendingEvent) {
    paintRows(snapshot, '', '');
  }
}

window.companion.onState(render);
window.companion.onError(message => { $('status').textContent = message; });
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });
