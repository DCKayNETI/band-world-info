/**
 * 乐团世界书 · Google Drive → GitHub 实时同步触发器
 * =====================================================
 * 部署位置：Google Apps Script（绑定到公开发布区文件夹所在账号）
 * 作用：公开发布区的文档被修改后，向 GitHub 发送 repository_dispatch 信号，
 *       触发 sync_gdrive.yml 立即拉取并重新部署网站。
 *
 * ── 部署步骤 ──
 * 1. script.google.com 新建项目，粘贴本文件全部代码；
 * 2. 项目设置 → 脚本属性，新增：
 *        GITHUB_PAT = <你的 Fine-grained PAT>
 *    （PAT 权限：仅本仓库、Contents: Read and write、有效期尽量短）
 * 3. 运行一次 setupTriggers()，授权后自动创建每 5 分钟的时间驱动触发器；
 * 4. （可选）在各文档中会出现"📡 通知网站更新"菜单，点击即即时触发；
 * 5. GitHub 侧无需改动：sync_gdrive.yml 已监听 repository_dispatch [gdrive_update]。
 */

// 公开发布区文件夹 ID（云端 agent 移交清单中提供）
var WATCHED_FOLDER_ID = '10-vGnxDG3d3muUiE_fODa5L6CfeUNzYZ';
var GITHUB_REPO = 'dckayneti/sakikos-starfield';
// 已知文档 ID 与上次修改时间快照的缓存键
var SNAPSHOT_KEY = 'gdrive_last_updated_snapshot';

/** 首次部署时手动运行一次：创建定时触发器 + 顶部菜单 */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'checkFolderUpdates') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('checkFolderUpdates').timeBased().everyMinutes(5).create();
  Logger.log('已创建 5 分钟级定时触发器。');
}

/** 文档打开时注入菜单（需配合简易 onOpen 安装触发器） */
function onOpen(e) {
  try {
    DocumentApp.getUi()
      .createMenu('📡 通知网站更新')
      .addItem('立即同步', 'notifyGithubNow')
      .addToUi();
  } catch (err) {
    /* 非 Docs 环境静默跳过 */
  }
}

/** 菜单入口：立即通知 GitHub */
function notifyGithubNow() {
  dispatchGithub();
}

/** 时间驱动入口：对比文件夹内各文档的 lastUpdated，有变化才通知 */
function checkFolderUpdates() {
  var folder = DriveApp.getFolderById(WATCHED_FOLDER_ID);
  var files = folder.getFiles();
  var snapshot = {};
  try {
    snapshot = JSON.parse(PropertiesService.getScriptProperties().getProperty(SNAPSHOT_KEY) || '{}');
  } catch (err) { snapshot = {}; }

  var changed = false;
  var current = {};
  while (files.hasNext()) {
    var f = files.next();
    var id = f.getId();
    var updated = f.getLastUpdated().getTime();
    current[id] = updated;
    if (snapshot[id] && snapshot[id] !== updated) changed = true;
  }

  // 首次运行只记录基线，不触发
  var isFirstRun = Object.keys(snapshot).length === 0;
  PropertiesService.getScriptProperties().setProperty(SNAPSHOT_KEY, JSON.stringify(current));

  if (changed && !isFirstRun) {
    Logger.log('检测到文档更新，通知 GitHub…');
    dispatchGithub();
  }
}

/** 向 GitHub 发送 repository_dispatch（Token 从脚本属性读取，不写入代码） */
function dispatchGithub() {
  var pat = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
  if (!pat) {
    Logger.log('缺少 GITHUB_PAT 脚本属性，无法通知。请先在项目设置中配置。');
    return;
  }
  var resp = UrlFetchApp.fetch('https://api.github.com/repos/' + GITHUB_REPO + '/dispatches', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + pat,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({ event_type: 'gdrive_update' }),
    muteHttpExceptions: true
  });
  Logger.log('GitHub dispatch 响应码: ' + resp.getResponseCode() + '（204 = 成功）');
}
