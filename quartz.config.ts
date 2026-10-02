import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4.0 Configuration for BanG Dream! MyGO!!!!! × Ave Mujica World Info
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "乐团世界书 · Band World Info",
    pageTitleSuffix: " | 乐团世界书",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "zh-CN",
    // ⚠️ 请在上线前替换为你的实际域名或 GitHub Pages 地址，例如: "your-username.github.io/your-repo"
    baseUrl: "dckayneti.github.io/band-world-info",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Noto Serif SC",
        body: "Noto Sans SC",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#533483",
          tertiary: "#847996",
          highlight: "rgba(83, 52, 131, 0.15)",
          textHighlight: "#fff23688",
        },
        darkMode: {
          light: "#0f111a",
          lightgray: "#1e2238",
          gray: "#646b82",
          darkgray: "#d4d8e8",
          dark: "#f3f4f8",
          secondary: "#a78bfa",
          tertiary: "#38bdf8",
          highlight: "rgba(167, 139, 250, 0.15)",
          textHighlight: "#a78bfa44",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        // 优化优先级：优先 frontmatter，其次从 git 历史提取真实修改时间，最后文件系统时间
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: true }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
