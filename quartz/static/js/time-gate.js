// 时间锁（Time-Gating）：未来切片毛玻璃遮罩与到点解锁
// 服务端（sync_gdrive.py）为时间戳 > 当前 JST 的切片正文包裹
// <div class="time-gate" data-unlock="ISO(JST)">，标头保持可见。
// 本脚本每分钟与页面聚焦时检测解锁时刻，平滑淡出遮罩。
(function () {
  function update() {
    var now = Date.now();
    var gates = document.querySelectorAll('.time-gate[data-unlock]');
    gates.forEach(function (el) {
      var t = Date.parse(el.getAttribute('data-unlock'));
      if (isNaN(t)) return;
      if (now >= t) {
        if (!el.classList.contains('time-gate-open')) {
          el.classList.add('time-gate-open');
          var badge = el.querySelector('.time-gate-badge');
          if (badge) {
            badge.textContent = '✨ 星轨抵达 · 该段世界线已成像';
            setTimeout(function () {
              badge.classList.add('time-gate-badge-fade');
            }, 2600);
          }
        }
      } else if (el.classList.contains('time-gate-open')) {
        el.classList.remove('time-gate-open'); // 时钟回拨等异常场景兜底
      }
    });
  }
  window.addEventListener('load', update);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) update();
  });
  setInterval(update, 60 * 1000);
  if (document.readyState !== 'loading') update();
  else document.addEventListener('DOMContentLoaded', update);
})()
