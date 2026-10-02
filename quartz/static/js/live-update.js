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
      '#live-update-capsule{position:fixed;right:20px;bottom:22px;z-index:2147483000;' +
      'display:flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;' +
      'background:rgba(15,17,26,.78);border:1px solid rgba(167,139,250,.45);' +
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
      'color:#f3f0ff;font-size:.88rem;letter-spacing:.02em;cursor:pointer;user-select:none;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.45),0 0 14px rgba(167,139,250,.25);' +
      'opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .35s ease}' +
      '#live-update-capsule.show{opacity:1;transform:translateY(0)}' +
      '#live-update-capsule:hover{border-color:rgba(245,208,97,.75);' +
      'box-shadow:0 6px 26px rgba(0,0,0,.5),0 0 18px rgba(245,208,97,.35)}' +
      '#live-update-capsule .lv-star{color:#f5d061}'
    document.head.appendChild(style)

    var capsule = document.createElement('div')
    capsule.id = 'live-update-capsule'
    capsule.setAttribute('role', 'button')
    capsule.innerHTML =
      '<span class="lv-star">✨</span><span>乐团世界线已更新，点击无感刷新</span>'
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
