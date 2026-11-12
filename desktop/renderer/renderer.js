const $ = id => document.getElementById(id);
let snapshot = { connected:false, playing:false, queue:[], index:0, total:0 };
let activeEvent = null;
let eventQueue = [];
let lastEventKey = '';
let animationTimer = null;
let previousPlaying = false;

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
function setNextRow(event) {
  const next = $('row3');
  next.textContent = event.segment;
  next.title = event.segment;
}
function finishTransition() {
  const next = eventQueue.shift();
  if (!next) {
    animationTimer = null;
    return;
  }
  activeEvent = next;
  const track = $('lyricTrack');
  track.classList.remove('advance');
  paintRows(next.state, next.segment, next.segmentZh);
  animationTimer = null;
  startNextTransition();
}
function startNextTransition() {
  if (animationTimer || !eventQueue.length) return;
  const next = eventQueue[0];
  if (!activeEvent) {
    eventQueue.shift();
    activeEvent = next;
    paintRows(next.state, next.segment, next.segmentZh);
    startNextTransition();
    return;
  }

  // Put the next spoken phrase on the lower lyric row before moving it into focus.
  setNextRow(next);
  const track = $('lyricTrack');
  track.classList.remove('advance');
  void track.offsetWidth;
  track.classList.add('advance');
  animationTimer = setTimeout(finishTransition, 540);
}
function render(state) {
  snapshot = { ...snapshot, ...state };
  if (Array.isArray(state.queue)) snapshot.queue = state.queue;
  updateStatus(snapshot);

  const index = getIndex(snapshot);
  const queue = Array.isArray(snapshot.queue) ? snapshot.queue : [];
  const item = queue[index] || snapshot;
  const segment = String(snapshot.segment || '').trim();

  // A pause/restart may legitimately replay the same phrase.
  if (!snapshot.playing && previousPlaying) lastEventKey = '';
  previousPlaying = !!snapshot.playing;

  // Ignore stale phrase text carried over while the playlist index is changing.
  // Only accept a phrase once it matches the current vocabulary item.
  if (segment && segmentBelongsToItem(segment, item)) {
    const key = index + '|' + normalize(segment);
    if (key !== lastEventKey) {
      lastEventKey = key;
      eventQueue.push({
        key,
        state: { ...snapshot, queue: [...queue] },
        segment,
        segmentZh: String(snapshot.segmentZh || '').trim()
      });
      startNextTransition();
    }
  }

  if (!activeEvent && !animationTimer && !eventQueue.length) {
    paintRows(snapshot, '', '');
  }
}
window.companion.onState(render);
window.companion.onError(message => { $('status').textContent = message; });
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });
