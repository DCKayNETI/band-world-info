# 《乐团世界书》数字花园维基站 (Quartz v4 覆盖包 v2.0)

本项目是基于 **Quartz (v4)** 架构构建的《BanG Dream! MyGO!!!!! × Ave Mujica》乐团世界观公开数字花园维基站。

> ⚠️ **关于本包的性质说明**：本压缩包为**“内容与配置覆盖包（Overlay Package）”**，包含了开箱即用的文档内容（content/）、静态沙盘资源（quartz/static/）、定制排版主题与 GitHub Actions CI/CD 流水线。初次建站需先获取官方模板，再将本包覆盖进去。

---

## 🌟 核心特性与修复清单 (v2.0)
- ✅ **沙盘静态渲染修复**：沙盘文件规范落位在 `quartz/static/sandbox.html`，由 Static 发射器原样输出，彻底解决 iframe 变下载与 404 问题。
- ✅ **Actions 自动写回权限修复**：`sync_gdrive.yml` 明确配置 `permissions: contents: write`，解除定时同步报 403 错误。
- ✅ **全员 16 份文档全量映射**：`sync_gdrive.py` 覆盖世界书、编年史、日记、随想及全部 11 位成员的专属长期记忆档案，支持自动剥除 BOM 字符。
- ✅ **全站高密度双向链接网 (Graph View)**：在世界书、编年史、日记及记忆档案中全面注入 `[[角色]]`、`[[地标]]`、`[[事件]]` 双链，激活真正的人际重力网与悬停预览卡片。
- ✅ **真实历史时间优先级**：`CreatedModifiedDate` 采用 `["frontmatter", "git", "filesystem"]`，精准呈现推演时间线。

---

## 🚀 3分钟极简建站与部署指引

### 第一步：Fork 或初始化官方模板
1. 访问 Quartz 官方模板：[jackyzha0/quartz](https://github.com/jackyzha0/quartz)；
2. 点击右上角 **Use this template** -> **Create a new repository**（例如命名为 `sakikos-starfield`，设为 **Public**）；
3. 进入仓库 **Settings** -> **Pages**，在 **Build and deployment** 下将 **Source** 切换为 **GitHub Actions**。

### 第二步：将本包文件覆盖至仓库
解压本安装包，将文件覆盖到你的仓库根目录：
```bash
git clone https://github.com/<你的用户名>/<你的仓库名>.git
cd <你的仓库名>
# 将本包解压出来的所有文件夹（content/、quartz/、.github/、scripts/ 等）覆盖复制进本仓库
git add .
git commit -m "feat: init Band World Info living garden v2"
git push origin v4
```

### 第三步：等待编译上线
推送后，在仓库的 **Actions** 标签页即可查看编译进度。约 30 秒后，你的公开维基站即可正式访问：
`https://<你的用户名>.github.io/<你的仓库名>/`

---

## ☁️ Cloudflare Pages 部署指引（可选备选方案）
若选择部署在 Cloudflare Pages：
- **Build command**: `npx quartz build`
- **Build output directory**: `public`
- **Environment variables**: 添加 `NODE_VERSION` = `22`

---

*详细架构与 Google Apps Script 实时同步配置，请参阅云端手册：*
*[《乐团世界书》全自动实时维基站落地实施手册.md](https://docs.google.com/document/d/1PRPVizuG5mpf_8sB_cbxO-qU213q9uj79r_cXQfdXdA/edit)*
