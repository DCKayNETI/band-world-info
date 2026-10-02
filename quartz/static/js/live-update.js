// 乐团世界书 · 客户端版本实时检测
// 部署产物根目录有 static/version.json（deploy 工作流盖戳）。
// 页面自身构建 sha 由 Head.tsx 写入 <meta name="build-sha">，Action 阶段替换占位符。
// 本地构建（占位符未被替换）时自动跳过检测。
(function () {
  var meta = document.querySelector('meta[name="build-sha"]')
  var localSha = meta ? meta.getAttribute('content') : null
  if (!localSha || localSha === 'BUILD_SHA_PLACEHOLDER') return

  var script =
    document.currentScript ||
    document.querySelector('script[src*="live-update"]')
  var scriptSrc = script && script.src ? script.src : ''
  // 从脚本自身 URL 推导站点前缀（兼容域名根部署与 /repo/ 项目页部署）
  var base = scriptSrc.replace(/static\/js\/live-update\.js.*$/, '')
  var versionUrl = base + 'static/version.json'
  var notifiedKey = 'live-update:lastNotifiedSha'

  function notify(sha) {
    if (sessionStorage.getItem(notifiedKey) === sha) return
    sessionStorage.setItem(notifiedKey, sha)
    if (document.getElementById('live-update-capsule')) return

    var style = document.createElement('style')
    style.textContent =
      '@keyframes lv-pulse{0%,100%{box-shadow:0 6px 26px rgba(0,0,0,.5),0 0 12px rgba(167,139,250,.35)}' +
      '50%{box-shadow:0 8px 34px rgba(0,0,0,.6),0 0 30px rgba(167,139,250,.75),0 0 60px rgba(245,208,97,.30)}}' +
      '@keyframes lv-shimmer{0%{background-position:-160px 0}100%{background-position:200px 0}}' +
      '@keyframes lv-bounce{0%{opacity:0;transform:translateY(24px) scale(.85)}' +
      '60%{opacity:1;transform:translateY(-4px) scale(1.05)}100%{opacity:1;transform:translateY(0) scale(1)}}' +
      '#live-update-capsule{position:fixed;right:22px;bottom:26px;z-index:2147483000;' +
      'display:flex;align-items:center;gap:10px;padding:15px 24px;border-radius:999px;' +
      'background:linear-gradient(135deg,rgba(24,20,48,.92),rgba(15,17,26,.88));' +
      'border:1.5px solid rgba(245,208,97,.65);' +
      'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
      'color:#ffffff;font-size:1.02rem;font-weight:600;letter-spacing:.03em;' +
      'cursor:pointer;user-select:none;' +
      'animation:lv-pulse 2.2s ease-in-out infinite,lv-bounce .55s cubic-bezier(.34,1.56,.64,1) both}' +
      '#live-update-capsule:hover{transform:scale(1.05);border-color:#f5d061}' +
      '#live-update-capsule .lv-star{font-size:1.3rem;filter:drop-shadow(0 0 6px rgba(245,208,97,.8));' +
      'animation:lv-pulse 1.6s ease-in-out infinite}' +
      '#live-update-capsule .lv-text{background:linear-gradient(100deg,#ffffff 35%,#f5d061 50%,#ffffff 65%);' +
      'background-size:200px 100%;-webkit-background-clip:text;background-clip:text;' +
      '-webkit-text-fill-color:transparent;animation:lv-shimmer 2.4s linear infinite}' +
      '#live-update-capsule .lv-arrow{font-size:1.1rem;color:#a78bfa;animation:lv-pulse 1.6s ease-in-out infinite}' +
      '@media (max-width:640px){#live-update-capsule{right:12px;bottom:14px;padding:10px 14px;' +
      'font-size:.82rem;gap:7px;max-width:calc(100vw - 24px)}' +
      '#live-update-capsule .lv-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto}}'
    document.head.appendChild(style)

    var capsule = document.createElement('div')
    capsule.id = 'live-update-capsule'
    capsule.setAttribute('role', 'button')
    capsule.innerHTML =
      '<span class="lv-star">✨</span><span class="lv-text">乐团世界线已更新 · 点击无感刷新</span><span class="lv-arrow">⟳</span>'
    capsule.addEventListener('click', function () {
      // 缓存穿透：清掉本站 Cache Storage 后整页重载
      if (window.caches && caches.keys) {
        caches.keys().then(function (keys) {
          keys.forEach(function (k) {
            caches.delete(k)
          })
        })
      }
      window.location.reload()
    })
    document.body.appendChild(capsule)
    requestAnimationFrame(function () {
      capsule.classList.add('show')
    })
  }

  function check() {
    if (document.hidden) return
    fetch(versionUrl + '?cb=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.json() : null
      })
      .then(function (v) {
        if (v && v.sha && v.sha !== localSha) notify(v.sha)
      })
      .catch(function () {
        /* version.json 不存在（本地构建）或网络异常：静默跳过 */
      })
  }

  window.addEventListener('visibilitychange', function () {
    if (!document.hidden) check()
  })
  window.addEventListener('pageshow', check)
  setInterval(check, 10 * 60 * 1000)
  if (document.readyState === 'complete') check()
  else window.addEventListener('load', check)
})()
