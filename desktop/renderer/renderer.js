const $ = id => document.getElementById(id);
let snapshot = { connected:false, playing:false, queue:[], index:0, total:0 };

function render(state) {
  snapshot = { ...snapshot, ...state };
  if (Array.isArray(state.queue)) snapshot.queue = state.queue;
  const queue = snapshot.queue || [];
  const index = Math.max(0, Math.min(Number(snapshot.index)||0, Math.max(0, queue.length-1)));
  const word = queue[index] || snapshot;
  const connected = !!snapshot.connected;
  const playing = !!snapshot.playing;

  $('status').textContent = !connected
    ? '○ 等待网页连接'
    : playing ? '● 网页正在播放' : '● 已连接 · 网页未播放';
  $('word').textContent = word.word || 'Ready?';
  $('phonetic').textContent = word.phonetic || (connected ? '等待网页播放单词' : '请打开 English 网页「连续听」并连接同步');
  $('meaning').textContent = word.meaning || '';
  $('example').textContent = word.example || '';
  $('exampleZh').textContent = word.exampleZh || '';
  $('segment').textContent = snapshot.segment || '';
  $('segmentZh').textContent = snapshot.segmentZh || '';
  $('progress').textContent = snapshot.total
    ? (Number(snapshot.index||0)+1)+' / '+snapshot.total
    : (queue.length ? (index+1)+' / '+queue.length : 'English');
}

window.companion.onState(render);
window.companion.onError(message => { $('status').textContent = message; });
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });
