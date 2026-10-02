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
    "1uMkTfLos3ia8QAOoKPY5ixFA7eSs87LmBhpR0idFKbA": "content/02-主世界编年史/主世界事件记录与编年史.md",
    "1k3RmSwz9G8zCDk97fut72KAfh3odRNt3SQ9fxlQglik": "content/03-乐团共享日记/乐团共享日记本.md",
    "1QixMpZwdImV1a65hx8jr5j_mWWPAIOeJv9FSxlp4TgY": "content/05-创作者随想/创作者世界观随想笔记.md",

    "1bMIVQ31xip0fegW6EsIheaRxZ29qjmDSJyofBU6KKw8": "content/06-全景沙盘/未来演进计划与版本发布日志.md",

    # 11 位成员专属记忆档案
    "1C3NoJ7mk8EjmnPgTEEx48eEbdFpgJIMSbTq0NyXMXTc": "content/04-成员记忆档案/丰川祥子_长期记忆档案.md",
    "1BeXSsxyyReIZXUq_U-VFsXv1BJSVOa5MNtwkMQlS2eM": "content/04-成员记忆档案/千早爱音_长期记忆档案.md",
    "1mcI0BdfWRnL3lyulIpjGIDYem9MdJVe3KvPVjjl7rEg": "content/04-成员记忆档案/长崎素世_长期记忆档案.md",
    "1qe305M7Dmzv9hauUVVHsde6_3zWWkJCQB4xFKgbHebo": "content/04-成员记忆档案/三角初华_长期记忆档案.md",
    "1V7fiFU5i_z4hO0wcIPVh_83X7p23QR5ofzP-8q4cUz0": "content/04-成员记忆档案/高松灯_长期记忆档案.md",
    "10M0YsCoHWiwQkhBjrFF4MOgf2s6Fxvl6uUhd5ZEismM": "content/04-成员记忆档案/椎名立希_长期记忆档案.md",
    "1pIoUm15zDfjD1PT0Z7Xzfn9ZouIxmcHMXU5CVzo8JKM": "content/04-成员记忆档案/要乐奈_长期记忆档案.md",
    "11Eu0oCLePSfedqEVxZU7sAJtOPbdKdBuxlBTIGrcXu4": "content/04-成员记忆档案/若叶睦_长期记忆档案.md",
    "1UQwl7HJgWlITy5QPMFa9J9NX_jJ13xupGXSRYxUB52I": "content/04-成员记忆档案/八幡海铃_长期记忆档案.md",
    "1WZrQ8_oqSqTCgSAQEmuxSaKlZpVHcM_noT_UIxS-f-A": "content/04-成员记忆档案/祐天寺若麦_长期记忆档案.md",
    "1iFecEoj-SODK5B8UmS_aDEzi0SMEfxg8DlqHjrcaWn8": "content/04-成员记忆档案/纯田真奈_长期记忆档案.md",
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


if __name__ == "__main__":
    print(f"Starting sync of {len(DOCS_MAP)} documents from Google Drive...")
    failures = [(d, p) for d, p in DOCS_MAP.items() if not sync_doc(d, p)]
    if failures:
        print(f"\n{len(failures)}/{len(DOCS_MAP)} documents FAILED to sync:")
        for d, p in failures:
            print(f"  - {p}")
        sys.exit(1)
    print("Sync complete: all documents pulled successfully.")
