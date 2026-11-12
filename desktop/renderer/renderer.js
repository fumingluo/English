const $ = id => document.getElementById(id);
function render(s) {
  $('status').textContent = s.connected ? (s.playing ? '● 正在播放' : '● 已连接') : '等待网页连接';
  $('word').textContent = s.word || 'Ready?';
  $('phonetic').textContent = s.phonetic || (s.connected ? '等待下一个单词' : '请打开 English 网页并进入「连续听」');
  $('meaning').textContent = s.meaning || '';
  $('example').textContent = s.example || '';
  $('segment').textContent = s.segment || '';
  $('progress').textContent = s.total ? (Number(s.index || 0) + 1) + ' / ' + s.total : 'English';
  document.querySelector('[data-action="toggle"]').textContent = s.playing ? 'Ⅱ' : '▶';
}
window.companion.onState(render);
window.companion.onError(message => $('status').textContent = message);
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => window.companion.control(button.dataset.action)));
$('hide').addEventListener('click', () => window.companion.window('hide'));
render({ connected:false });
