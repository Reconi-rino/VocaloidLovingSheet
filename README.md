# 术曲个人喜好表

交互式术曲（Vocaloid / UTAU / CeVIO / Synthesizer V / Piapro Characters / 中文虚拟歌姬等）个人喜好表生成器。支持搜索、编辑、主题切换、导入导出、PNG 导出等功能。

## 如何运行

```bash
npm install
npm run dev
```

浏览器打开终端中显示的本地地址即可使用。

构建生产版本：

```bash
npm run build
```

预览生产版本：

```bash
npm run preview
```

## 部署

### Vercel（推荐）

项目包含 `vercel.json`、`api/image.ts` 和 `api/vocadb.ts`。部署到 Vercel 后，PNG 导出会优先通过同源接口代理远程图片：

```text
/api/image?url=<encoded remote image url>
```

这个代理用于缓解远程图片 CORS、跳转、`static.vocadb.net`、`ytimg` 等图片在 Canvas 导出时不可读的问题。代理会：

- 只接受 `http/https` 图片 URL。
- 拒绝 localhost / local 地址。
- 限制图片大小为 16MB。
- 返回 `Access-Control-Allow-Origin: *`。
- 设置 CDN 缓存头。

在线搜索会优先通过同源 VocaDB 缓存代理：

```text
/api/vocadb?resource=songs&query=<keyword>&start=0&maxEntries=20
```

这个接口只允许访问 VocaDB 的 `songs` / `artists` / `albums` 查询，并对白名单参数做限制。接口会设置共享 CDN 缓存和服务端内存缓存，热门搜索词、热门歌手/歌曲相关分页能被所有用户复用；如果该接口不可用，前端会自动回退到原有的 VocaDB 直连和公共代理路径。

部署命令：

```bash
npm run build
vercel --prod
```

Vercel 构建时会使用根路径 base；本地普通构建仍保留 GitHub Pages 的 `/VocaloidLovingSheet/` base。

### GitHub Pages

GitHub Pages 工作流仍可用，但没有 `/api/image` 图片代理。页面可正常填写和预览，PNG 导出遇到远程图 CORS 时会回退到原始图片或占位图。

## 功能说明

### 表格编辑
- 5 列 x 6 行响应式网格，共 30 个分类格子。
- 桌面端保持 5 列布局，移动端自动变为 2 列或 1 列。
- 点击格子打开编辑弹窗，可搜索或手动填写条目。
- 每个格子可独立编辑、清空。

### 搜索
- 基于 Fuse.js 的本地模糊搜索。
- 支持搜索歌曲名、别名、P 主、歌姬、专辑。
- 自定义条目也可被搜索到。

### 编辑弹窗
- 类型选择：歌曲、P 主、歌姬、专辑、自定义。
- 搜索结果展示封面、标题、别名、P 主、歌姬、来源链接。
- 手动编辑字段：标题、原文名、中文名、日文名、英文名、别名、P 主、歌姬、专辑、年份、平台链接、封面 URL 等。
- 图片支持本地上传、URL 粘贴预览、object-fit 选项（裁切 / 完整显示 / 居中）。
- 别名可动态添加和删除。
- "保存为我的条目"可将条目存入本地自定义数据库，后续可搜索复用。

### 主题切换
提供 4 套视觉主题：
1. **黑白原图风** - 白底、黑色细边框，接近原图风格。
2. **清爽编辑风** - 浅色背景、现代克制，适合长期填写。
3. **深色舞台风** - 深色背景，术曲氛围感。
4. **杂志拼贴风** - 适合导出分享，图片更突出。

### 导入导出
- **导出 PNG**：完整 5x6 表格高清图片，至少 2x 缩放。
- **导出 JSON**：包含所有填写内容、自定义条目、主题设置。
- **导入 JSON**：恢复之前导出的表格数据。
- **复制分享文本**：生成纯文本格式的喜好表摘要，可直接粘贴分享。
- **自动保存**：每次编辑后自动保存到 localStorage，刷新不丢失。
- **清空**：二次确认后重置所有内容。

## 数据结构说明

### Entry（条目）

```typescript
type EntryType = "song" | "producer" | "singer" | "album" | "custom";

interface Entry {
  id: string;
  type: EntryType;
  title: string;
  originalTitle?: string;
  displayTitle?: string;
  chineseTitle?: string;
  japaneseTitle?: string;
  englishTitle?: string;
  aliases: string[];
  producers: string[];
  singers: string[];
  album?: string;
  year?: number | string;
  description?: string;
  coverUrl?: string;     // 歌曲 / 专辑封面
  avatarUrl?: string;    // P 主头像
  portraitUrl?: string;  // 歌姬立绘
  sourceLinks: { label: string; url: string }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### PreferenceCellData（格子数据）

```typescript
interface PreferenceCellData {
  categoryId: string;
  categoryLabel: string;
  entry?: Entry;
  note?: string;
  imageFit?: "cover" | "contain" | "center";
}
```

### Category（分类定义）

```typescript
interface Category {
  id: string;           // 如 "cat-1"
  label: string;        // 如 "入坑作"
  hintType: EntryType;  // 推荐的条目类型
}
```

## 如何接入真实数据源

项目内置了数据源抽象层（`SearchAdapter` 接口），支持接入外部 API。

### VocaDB API（推荐）

VocaDB 是最权威的术曲数据库，覆盖歌曲、P 主/艺术家、专辑、PV、标签、别名、多语言标题。

- 官网：https://vocadb.net/
- API 文档：https://vocadb.net/swagger/index.html
- GitHub：https://github.com/VocaDB/vocadb

接入方式：在 `src/services/adapters/` 中实现 `vocadbAdapter`，调用 VocaDB REST API 进行搜索。注意 CORS 限制，可能需要通过服务端代理转发请求。

### YouTube Data API

可用于补充视频标题、频道、缩略图、播放链接。

- 文档：https://developers.google.com/youtube/v3/docs/search/list
- 需要 API Key，有配额限制。

### Niconico

适合补充 Niconico PV 信息、投稿时间、缩略图等。推荐作为 VocaDB PV 外链的补充。

### LrcAPI Cover（实验性）

用于在 VocaDB 图片、YouTube 缩略图不可用时补充歌曲/专辑封面和歌手图片。

- 文档：https://docs.lrc.cx/docs/legacy/cover/
- 公开接口：https://api.lrc.cx/cover
- 查询方式：歌曲使用 `title + artist (+ album)`，专辑使用 `album (+ artist)`，P 主/歌姬使用 `artist`
- 注意：接口可能直接返回图片，也可能重定向到图片；部署到 Vercel 时 PNG 导出会先通过 `/api/image` 代理读取，失败后继续 fallback 到下一个来源或占位图。

### Bilibili

适合中文术曲、搬运、中文字幕、中文虚拟歌姬内容。建议保留"用户粘贴链接 / 手动补充"的路径，不建议前端直连未公开接口。

### 数据源策略

- 主搜索：本地 seed 数据 + 用户自定义条目 + VocaDB
- 视频补全：VocaDB PV 链接 + YouTube / Niconico
- 中文内容：本地 seed + 手动链接 + 未来 Bilibili adapter
- 立绘头像：默认占位图 + 用户上传；官方图仅作为链接字段，不默认热链

## 技术栈

- **Vite** - 构建工具
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS v4** - 原子化 CSS
- **Fuse.js** - 模糊搜索
- **Canvas API** - 固定 5x6 布局 PNG 导出
- **lucide-react** - 图标库
- **localStorage** - 本地持久化

## 项目结构

```
src/
  main.tsx              # 入口
  App.tsx               # 主组件，状态管理与编排
  types.ts              # TypeScript 类型定义
  data/
    categories.ts       # 30 个分类定义
    seedEntries.ts      # 40+ 条示例数据
  services/
    search.ts           # Fuse.js 搜索服务
    storage.ts          # localStorage 持久化
    export.ts           # PNG / JSON 导出
    image.ts            # 图片工具函数
    adapters/
      types.ts          # SearchAdapter 接口
  components/
    Toolbar.tsx         # 顶部工具栏
    PreferenceGrid.tsx  # 5x6 喜好表格
    PreferenceCell.tsx  # 单个格子
    EntryEditorModal.tsx # 编辑弹窗
    SearchPanel.tsx     # 搜索面板
    EntryForm.tsx       # 条目表单
    ThemeSwitcher.tsx   # 主题切换
    ImagePicker.tsx     # 图片选择 / 上传
    AliasEditor.tsx     # 别名编辑器
    ExportPreview.tsx   # 导出预览
  styles/
    themes.css          # 4 套主题 CSS 变量
    globals.css         # 全局样式（导入 themes.css）
```

## 浏览器兼容性

支持所有现代浏览器（Chrome、Firefox、Safari、Edge 最新版本）。
