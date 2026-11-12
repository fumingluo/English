const $ = id => document.getElementById(id);
let snapshot = { connected:false }, queue = [], localIndex = 0;
let localPlaying = false, localPaused = false, localToken = 0, localSegment = '', localSegmentZh = '';
let localMode = 'easy', localGap = 1500, localRate = 1, localLoop = false;

function render(s) {
  snapshot = { ...snapshot, ...s };
  if (Array.isArray(s.queue) && s.queue.length) {
    queue = s.queue;
    if (!localPlaying) localIndex = Math.max(0, Math.min(Number(s.index)||0, queue.length-1));
    localMode = s.mode || localMode;
    localGap = Number(s.gap) || localGap;
    localRate = Number(s.rate) || localRate;
    localLoop = !!s.loop;
  }
  updateDisplay();
}
function updateDisplay() {
  const w = queue[localIndex] || snapshot;
  $('status').textContent = localPlaying ? (localPaused ? 'Ⅱ 桌面播放已暂停' : '● 桌面独立播放') : (snapshot.connected ? (snapshot.playing ? '● 网页正在播放' : '● 已连接 · 可独立播放') : (queue.length ? '● 离线播放就绪' : '等待网页同步词库'));
  $('word').textContent = w.word || 'Ready?';
  $('phonetic').textContent = w.phonetic || (queue.length ? '桌面语音引擎已就绪' : '请打开 English 网页并进入「连续听」同步词库');
  $('meaning').textContent = w.meaning || '';
  $('example').textContent = w.example || '';
  $('exampleZh').textContent = w.exampleZh || '';
  $('segment').textContent = localPlaying ? localSegment : (snapshot.segment || '');
  $('segmentZh').textContent = localPlaying ? localSegmentZh : (snapshot.segmentZh || '');
  $('progress').textContent = queue.length ? (localIndex+1)+' / '+queue.length : (snapshot.total ? (Number(snapshot.index||0)+1)+' / '+snapshot.total : 'English');
  document.querySelector('[data-action="toggle"]').textContent = localPlaying && !localPaused ? 'Ⅱ' : '▶';
}
async function wait(ms, token) {
  let elapsed = 0;
  while (elapsed < ms && token === localToken && localPlaying) {
    if (!localPaused) elapsed += 100;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return token === localToken && localPlaying;
}
function speak(text, lang, token, zh='') {
  return new Promise(resolve => {
    if (token !== localToken || !localPlaying) return resolve(false);
    const value = String(text || '').trim();
    if (!value) return resolve(true);
    localSegment = value;
    localSegmentZh = zh || '';
    updateDisplay();
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      $('status').textContent = '此 Windows 环境暂不支持系统语音';
      return resolve(false);
    }
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = lang || 'en-US';
    utterance.rate = localRate;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.toLowerCase() === utterance.lang.toLowerCase() && (utterance.lang === 'en-US' ? /Samantha|Google US English|Aria|Jenny/i.test(v.name) : true)) || voices.find(v => v.lang.toLowerCase().startsWith(utterance.lang.slice(0,2).toLowerCase()));
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve(token === localToken && localPlaying);
    utterance.onerror = () => resolve(token === localToken && localPlaying);
    try { speechSynthesis.speak(utterance); } catch (_) { resolve(false); }
  });
}
async function playLoop(token) {
  while (localPlaying && token === localToken && queue.length) {
    const w = queue[localIndex];
    if (!w) break;
    if (localMode === 'recall') {
      if (!await speak(w.meaning, 'zh-CN', token)) break;
      if (!await wait(3000, token)) break;
      if (!await speak(w.word, 'en-US', token)) break;
    } else if (localMode === 'immersive') {
      if (!await speak(w.word, 'en-US', token)) break;
      if (w.example && w.example.trim().toLowerCase() !== w.word.trim().toLowerCase()) {
        if (!await wait(500, token)) break;
        if (!await speak(w.example, 'en-US', token, w.exampleZh)) break;
      }
    } else {
      if (!await speak(w.word, 'en-US', token)) break;
      if (!await wait(500, token)) break;
      if (w.meaning && !await speak(w.meaning, 'zh-CN', token)) break;
      if (!await wait(500, token)) break;
      if (!await speak(w.word, 'en-US', token)) break;
    }
    if (!await wait(localGap, token)) break;
    if (localIndex < queue.length-1) localIndex++;
    else if (localLoop) localIndex = 0;
    else { localPlaying = false; break; }
    localSegment = ''; localSegmentZh = '';
    updateDisplay();
  }
  if (token === localToken) {
    localPlaying = false;
    localSegment = ''; localSegmentZh = '';
    updateDisplay();
  }
}
function startLocal() {
  if (!queue.length) { $('status').textContent = '请先在网页「连续听」页面同步播放列表'; return; }
  if (localPlaying) return;
  localPlaying = true;
  localPaused = false;
  localToken++;
  try { window.companion.control('stop'); } catch (_) {}
  updateDisplay();
  playLoop(localToken);
}
function stopLocal() {
  localPlaying = false;
  localPaused = false;
  localToken++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  localSegment = ''; localSegmentZh = '';
  updateDisplay();
}
function pauseLocal() {
  if (!localPlaying || localPaused) return;
  localPaused = true;
  if ('speechSynthesis' in window) speechSynthesis.pause();
  updateDisplay();
}
function resumeLocal() {
  if (!localPlaying || !localPaused) return;
  localPaused = false;
  if ('speechSynthesis' in window) speechSynthesis.resume();
  updateDisplay();
}
function moveLocal(delta) {
  if (!queue.length) return;
  const resume = localPlaying;
  stopLocal();
  localIndex = Math.max(0, Math.min(queue.length-1, localIndex+delta));
  updateDisplay();
  if (resume) startLocal();
}
window.companion.onState(render);
window.companion.onError(message => { $('status').textContent = message; });
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
  const action = button.dataset.action;
  if (action === 'toggle') { if (localPlaying && !localPaused) pauseLocal(); else if (localPlaying && localPaused) resumeLocal(); else startLocal(); }
  else if (action === 'next') moveLocal(1);
  else if (action === 'prev') moveLocal(-1);
}));
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });
