const $ = id => document.getElementById(id);
let snapshot = { connected:false, playing:false, queue:[], index:0, total:0 };
let lastLine = '';

function setMarquee(text) {
  const viewport = document.querySelector('.marquee-viewport');
  const marquee = $('marquee');
  const clean = String(text || 'Waiting for webpage playback');
  if (clean === lastLine) return;
  lastLine = clean;
  marquee.classList.remove('rolling');
  marquee.innerHTML = '';
  const first = document.createElement('span');
  first.textContent = clean;
  marquee.appendChild(first);
  requestAnimationFrame(() => {
    const overflow = first.getBoundingClientRect().width - viewport.getBoundingClientRect().width;
    if (overflow > 12) {
      const copy = document.createElement('span');
      copy.textContent = clean;
      copy.setAttribute('aria-hidden','true');
      marquee.appendChild(copy);
      const distance = first.getBoundingClientRect().width;
      const duration = Math.max(8, Math.min(28, distance / 34));
      marquee.style.setProperty('--scroll-distance', distance + 'px');
      marquee.style.setProperty('--scroll-duration', duration + 's');
      marquee.classList.add('rolling');
    }
  });
}

function render(state) {
  snapshot = { ...snapshot, ...state };
  if (Array.isArray(state.queue)) snapshot.queue = state.queue;
  const queue = snapshot.queue || [];
  const index = Math.max(0, Math.min(Number(snapshot.index)||0, Math.max(0, queue.length-1)));
  const word = queue[index] || snapshot;
  const connected = !!snapshot.connected;
  const playing = !!snapshot.playing;
  const spoken = String(snapshot.segment || '').trim();
  const displayText = spoken || word.word || 'Ready?';
  let translation = String(snapshot.segmentZh || '').trim();
  if (!translation) {
    if (spoken && spoken === String(word.meaning || '').trim()) translation = word.word || '';
    else translation = word.meaning || '';
  }

  $('ticker').classList.toggle('playing', connected && playing);
  $('status').textContent = !connected
    ? '等待网页连接'
    : playing ? '网页正在播放' : '已连接 · 网页已暂停';
  $('translation').textContent = translation;
  $('translation').title = translation;
  $('liveDot').title = playing ? '网页正在播放' : '网页已暂停';
  $('progress').textContent = snapshot.total
    ? (Number(snapshot.index||0)+1)+' / '+snapshot.total
    : (queue.length ? (index+1)+' / '+queue.length : '');
  setMarquee(displayText);
}

window.companion.onState(render);
window.companion.onError(message => { $('status').textContent = message; });
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });
