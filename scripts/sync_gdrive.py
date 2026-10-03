r"""
Google Drive to Quartz content/ Sync Helper
Includes all 15 core documents: World Info, Chronicle, Diary, Creator Notes, and 11 Member Memory Archives.

Google Drive 云端文档为唯一权威源（Single Source of Truth）；本脚本将其 Markdown 导出
拉取覆盖到仓库 content/。导出结果会对方括号做逐字符转义（\[\[...\]\]），
Quartz 的双链解析器无法识别，因此先经 unescape_wikilinks() 管道还原。
"""
import os
import re
import sys
import urllib.request

DOCS_MAP = {
    # 核心载体
    "1TpwLPKhmtwAGInf2WfUYyFoQsL3QO4gmVIO4zFOfGYo": "content/01-乐团世界书/乐团世界书_World_Info.md",
    "1uMkTfLos3ia8QAOoKPY5ixFA7eSs87LmBhpR0idFKbA": "content/02-主世界编年史/主世界事件记录与编年史_2026年10月卷.md",
    "1k3RmSwz9G8zCDk97fut72KAfh3odRNt3SQ9fxlQglik": "content/03-乐团共享日记/乐团共享日记本.md",
    "1QixMpZwdImV1a65hx8jr5j_mWWPAIOeJv9FSxlp4TgY": "content/05-创作者随想/创作者世界观随想笔记.md",

    "1bMIVQ31xip0fegW6EsIheaRxZ29qjmDSJyofBU6KKw8": "content/06-全景沙盘/未来演进计划与版本发布日志.md",

    # 11 份记忆档案已移出映射：权威源为仓库（demux 独占写入），云端 Docs 封存为历史快照
}

# Google Docs 的 Markdown 导出会把字面 [[...]] 逐括号转义成 \[\[...\]\]，
# 且括号内的字符（如 MyGO!!!!! 的 !）也会被转义成 \!，Quartz 的双链解析器
# 无法识别，必须整段还原。未参与双链的孤立转义括号保持原样，不影响渲染。
ESCAPED_WIKILINK = re.compile(r"\\\[\\\[([^\n]+?)\\\]\\\]")


# 公约示例占位符：云端文档里作为示例书写的字面 [[...]] 经转义还原后会
# 变成真实的双链，在图谱中生成幽灵节点，这里做定点中性化。
GHOST_EXAMPLES = {
    "[[角色名]]": "『角色名』",
    "[[地标]]": "『地标』",
}


def unescape_wikilinks(text: str) -> str:
    """把导出中的 \\[\\[...\\]\\] 还原为字面 [[...]]，并去掉链接目标内的转义符。"""
    return ESCAPED_WIKILINK.sub(lambda m: "[[" + m.group(1).replace("\\", "") + "]]", text)


def sync_doc(doc_id: str, target_path: str) -> bool:
    url = f"https://docs.google.com/document/d/{doc_id}/export?format=md"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            if resp.status != 200:
                raise RuntimeError(f"HTTP {resp.status}")
            content = resp.read().decode("utf-8-sig", errors="replace").replace("\ufeff", "")
            content = unescape_wikilinks(content)
            for ghost, neutral in GHOST_EXAMPLES.items():
                content = content.replace(ghost, neutral)

            # frontmatter（title/tags/aliases 等）只在仓库侧维护，同步时原样保留
            frontmatter = ""
            if os.path.exists(target_path):
                with open(target_path, "r", encoding="utf-8") as f:
                    old_text = f.read()
                if old_text.startswith("---"):
                    parts = old_text.split("---", 2)
                    if len(parts) >= 3:
                        frontmatter = f"---{parts[1]}---\n\n"

            final_content = frontmatter + content
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(final_content)
            print(f"[OK] Synced: {target_path}")
            return True
    except Exception as e:
        print(f"[FAIL] {target_path} (doc {doc_id}): {e}", file=sys.stderr)
        return False



# ─────────────────────────────────────────────────────────────
# 编年史自动分流（demux）：从编年史卷提取「个人记忆分流指引」，
# 将主观切片增量追加到对应成员记忆档案的「4. 主世界历史与日常演进纪要」。
# 追加式账本：已分流切片不重复处理，不支持追溯修改（会告警）。
# ─────────────────────────────────────────────────────────────
MEMORIES_DIR = os.path.join("content", "04-成员记忆档案")
DEMUX_SECTION = "## 4. 主世界历史与日常演进纪要"
SLICE_HEADER = re.compile(r"^#{2,4}\s*\*{0,2}【(?P<label>[^】]+)】\*{0,2}\s*$", re.M)
DEMUX_ANCHOR = re.compile(r"^[*\s]*个人记忆分流指引\*{0,2}\s*[::]\s*$", re.M)
LINK = re.compile(r"\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]")


def _clean(text: str) -> str:
    text = text.replace("\\-", "-").replace("\\!", "!").replace("\\.", ".").replace("\\,", ",")
    text = text.replace("**", "").replace("`", "").strip()
    return re.sub(r"\s+", " ", text)


def _memory_file_index():
    """成员名 → 档案文件路径 的映射（同时登记全名与短名）。"""
    index = {}
    if os.path.isdir(MEMORIES_DIR):
        for fn in os.listdir(MEMORIES_DIR):
            if fn.endswith(".md"):
                stem = fn[:-3]
                index[stem] = os.path.join(MEMORIES_DIR, fn)
                index[stem.split("_")[0]] = os.path.join(MEMORIES_DIR, fn)
    return index


def demux_volume(volume_path: str, name_index: dict, warnings: list) -> int:
    with open(volume_path, "r", encoding="utf-8") as f:
        text = f.read()
    headers = list(SLICE_HEADER.finditer(text))
    if not headers:
        return 0
    appended = 0
    for i, h in enumerate(headers):
        label = h.group("label").strip()
        body_start = h.end()
        body_end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
        body = text[body_start:body_end]
        anchor = DEMUX_ANCHOR.search(body)
        if not anchor:
            continue
        tail = body[anchor.end():]
        entries = []
        for raw_line in tail.splitlines():
            line = _clean(raw_line)
            if not line:
                continue
            links = LINK.findall(line)
            if not links:
                break  # 分流块结束（遇到第一个非条目行）
            desc = LINK.sub("", line)
            desc = re.sub(r"^[\-\s:*&]+", "", desc).strip(" :：-")
            for target, alias in links:
                entries.append((target.strip(), alias, desc))
        if not entries:
            warnings.append(f"[demux] 切片「{label[:40]}」的分流块无法解析，已原样保留于卷内")
            continue
        for target, alias, desc in entries:
            path = name_index.get(target) or name_index.get((alias or "").strip())
            if not path:
                warnings.append(f"[demux] 未知目标「{target}」，条目保留于卷内：{desc[:40]}")
                continue
            with open(path, "r", encoding="utf-8") as f:
                mem_text = f.read()
            if f"【{label[:18]}" in mem_text:
                continue  # 双层去重②：目标档案已含该切片标记
            with open(path, "a", encoding="utf-8", newline="\n") as f:
                if DEMUX_SECTION not in mem_text:
                    f.write(f"\n\n# **{DEMUX_SECTION}**\n\n")
                f.write(f"- **【{label}】** {desc}\n")
            appended += 1
    return appended


def demux_chronicle_to_profiles() -> None:
    name_index = _memory_file_index()
    warnings = []
    total = 0
    chronicle_dir = os.path.join("content", "02-主世界编年史")
    for fn in sorted(os.listdir(chronicle_dir)):
        if fn.endswith(".md") and "卷" in fn:
            total += demux_volume(os.path.join(chronicle_dir, fn), name_index, warnings)
    print(f"[demux] 分流完成：新增记忆条目 {total} 条")
    for w in warnings:
        print(w, file=sys.stderr)


if __name__ == "__main__":
    print(f"Starting sync of {len(DOCS_MAP)} documents from Google Drive...")
    failures = [(d, p) for d, p in DOCS_MAP.items() if not sync_doc(d, p)]
    if failures:
        print(f"\n{len(failures)}/{len(DOCS_MAP)} documents FAILED to sync:")
        for d, p in failures:
            print(f"  - {p}")
        sys.exit(1)
    print("Sync complete: all documents pulled successfully.")
    demux_chronicle_to_profiles()
