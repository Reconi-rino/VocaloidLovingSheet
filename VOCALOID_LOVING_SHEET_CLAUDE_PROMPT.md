# 术曲个人喜好表交互式网页应用 Claude 总控 Prompt

把本文件交给 Claude 使用时，请让它直接执行实现。目标是烧掉足够多的 Claude token 来换取高质量交付，但不要让它空谈方案。

## 一句话目标

基于“术曲个人喜好表”图片，构建一个可搜索、可自定义、可上传图片、可自动保存、可导入导出、可导出 PNG 的交互式网页应用。

## 推荐执行方式

如果 Claude 环境支持项目级 skill，请调用：

```text
使用 vocaloid-loving-sheet-builder skill，按它的多 agent 流程直接实现。
```

如果 Claude 环境不支持 skill，就直接把本文件全文作为任务 prompt。

如果 Claude 环境支持 subagents / Task 工具，先并行启动四个角色：

- `vocaloid-product-interaction`: 产品、表格结构、编辑流程、导出流程。
- `vocaloid-data-search`: Entry 类型、seed 数据、别名搜索、本地存储、外部数据源 adapter。
- `vocaloid-ui-export`: 视觉主题、响应式、图片上传、PNG 导出稳定性。
- `vocaloid-integration-qa`: 工程整合、构建、README、验收与 bug 修复。

主 Claude 必须作为 tech lead 整合结果，最终交付一个可运行项目，而不是只输出四份建议。

## 总任务

你是一个资深前端全栈工程师、产品设计师和技术负责人。请基于以下需求，直接设计并实现一个“术曲个人喜好表”的交互式网页应用。目标不是做简单表单，而是做一个真正好用、可保存、可分享、可导出图片的 Vocaloid / UTAU / CeVIO / Synthesizer V / Piapro Characters / 中文虚拟歌姬等术曲喜好表生成器。

不要只给方案。请直接产出可运行代码。

如果当前目录已有项目，先检查技术栈并尽量沿用。如果是空目录或不适合，优先使用：

- Vite + React + TypeScript
- Tailwind CSS
- localStorage，必要时 IndexedDB
- Fuse.js 用于本地模糊搜索
- html-to-image 或 dom-to-image 用于导出 PNG
- lucide-react 用于图标

界面语言使用中文。

## 原始表格分类

这是一个 5 列 x 6 行的“术曲个人喜好表”，每格填写一首歌、一个 P 主、一个歌姬、一个专辑或一个相关条目。

第 1 行：

1. 入坑作
2. 最喜欢的
3. 循环最多
4. 最推荐
5. 听的第一首

第 2 行：

6. 喜欢但大众不爱
7. 讨厌但大众喜欢
8. 最被低估
9. 被高估
10. 最爱听的 P 主

第 3 行：

11. 最佳 PV
12. 最佳调教
13. 调的最烂
14. 最佳伴奏
15. 最治愈

第 4 行：

16. 最冷门
17. 最燃
18. 最佳歌词
19. 最有趣
20. 最搞怪

第 5 行：

21. 最感动
22. 最洗脑
23. 最擦边
24. 最喜欢的专辑
25. 期待哪个 P 的新歌

第 6 行：

26. 近期喜欢的歌
27. 最喜欢的歌姬
28. 收藏最多的歌姬
29. 外表最萌的歌姬
30. 喜欢此歌姬的声音

## 主界面要求

页面第一屏就是可编辑喜好表，不要做营销落地页。

顶部区域：

- 标题：“术曲个人喜好表”
- 表格标题自定义输入
- 作者 / 昵称输入
- 模板风格切换
- 保存
- 导入 JSON
- 导出 JSON
- 导出 PNG
- 复制分享文本
- 清空

主体：

- 5 列 x 6 行响应式网格。
- 桌面端保持类似原图的 5 列布局。
- 移动端可变为 2 列或 1 列。
- 导出 PNG 时必须固定标准 5 列大图。

每个格子包含：

- 封面图 / P 主头像 / 歌姬立绘区域
- 分类标题
- 主标题：歌曲名 / P 主名 / 歌姬名 / 专辑名
- 副标题：P 主、歌姬、专辑、年份、平台等
- 标签：别名、歌姬、P 主、语种、引擎、风格等
- 备注文本

空格子显示“点击选择 / 自定义填写”。点击格子打开编辑弹窗。

## 编辑弹窗要求

每个格子的编辑弹窗必须完整：

- 顶部显示当前分类名。
- 类型选择：歌曲、P 主、歌姬、专辑、自定义。
- 搜索输入支持搜索歌曲名、别名、P 主、歌姬、专辑。
- 搜索结果展示封面 / 头像、标题、别名、P 主、歌姬、来源链接。
- 支持“使用这个结果”填入格子。

手动编辑字段：

- 标题
- 原文名
- 中文名
- 日文名
- 英文名
- 别名数组
- P 主
- 歌姬
- 专辑
- 年份
- 平台链接
- 封面 URL
- 头像 URL
- 立绘 URL
- 备注

图片能力：

- 本地上传封面
- 本地上传 P 主头像
- 本地上传歌姬立绘
- 上传后用 base64 或 IndexedDB 保存，刷新后尽量保留
- 支持移除图片
- 支持图片预览
- 至少提供 object-fit 选项：裁切、完整显示、居中
- 图片太大时压缩或限制并提示

保存能力：

- “保存为我的条目”：进入本地自定义数据库，后续可搜索。
- “仅用于当前格子”：只保存到当前表格格子。
- 关闭弹窗前未保存内容不能直接丢失。

## 数据模型

请实现严谨 TypeScript 类型，不要大量 `any`。

```ts
export type EntryType = "song" | "producer" | "singer" | "album" | "custom";

export interface SourceLink {
  label: string;
  url: string;
}

export interface Entry {
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
  coverUrl?: string;
  avatarUrl?: string;
  portraitUrl?: string;
  sourceLinks: SourceLink[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PreferenceCellData {
  categoryId: string;
  categoryLabel: string;
  entry?: Entry;
  note?: string;
  imageFit?: "cover" | "contain" | "center";
}
```

## 搜索与数据源

实现数据源抽象层，不要把搜索逻辑写死在 UI 里。

必须实现：

- 本地示例数据库 `seedEntries`，至少 40 条，覆盖经典术曲、P 主、歌姬、专辑。
- Fuse.js 本地模糊搜索。
- 搜索字段：title、originalTitle、displayTitle、中文名、日文名、英文名、aliases、producers、singers、album、tags。
- localStorage 或 IndexedDB 自定义条目数据库。
- 外部搜索 adapter 接口。

Adapter 设计建议：

```ts
export interface SearchAdapter {
  name: string;
  enabled: boolean;
  searchSongs(query: string): Promise<Entry[]>;
  searchProducers(query: string): Promise<Entry[]>;
  searchSingers(query: string): Promise<Entry[]>;
  searchAlbums(query: string): Promise<Entry[]>;
}
```

先实现：

- `localAdapter`
- `customEntryAdapter`
- `mockExternalAdapter`
- `vocadbAdapter` 的接口和可选实现。如果 CORS 或接口限制导致前端直连不稳定，保留清晰代码路径并默认关闭，README 写明如何开启或通过服务端代理接入。

## 权威或较可靠数据源建议

优先级从高到低：

1. VocaDB
   - 最适合做术曲数据库主数据源。
   - 覆盖歌曲、P 主/艺术家、专辑、PV、标签、别名、多语言标题。
   - 有 Web API 和 OpenAPI/Swagger 文档。
   - 推荐用途：搜索歌曲、P 主、专辑、关联 PV、取封面和别名。
   - 入口：
     - https://vocadb.net/
     - https://vocadb.net/swagger/index.html
     - https://github.com/VocaDB/vocadb

2. YouTube Data API
   - 官方视频平台 API。
   - 推荐用途：补视频标题、频道、缩略图、播放链接。
   - 缺点：需要 API key，有 quota；搜索结果不等于权威曲库。
   - 入口：https://developers.google.com/youtube/v3/docs/search/list

3. Niconico Snapshot Search API / Niconico 视频页面
   - 适合补 Niconico PV 信息、投稿时间、缩略图、播放数等。
   - 推荐作为 VocaDB PV 外链的补充，而不是主数据源。
   - 注意确认当前 API endpoint、User-Agent 要求和 CORS。

4. MediaWiki / Fandom 类 wiki
   - 包括 Vocaloid Lyrics Wiki、Hatsune Miku Wiki 等。
   - 推荐用途：补别名、外文标题、条目说明。
   - 注意不要抓歌词全文；歌词有版权风险。
   - 可用 MediaWiki API：`/api.php?action=query&list=search&srsearch=...&format=json`

5. 官方角色 / 软件站点
   - Crypton / Piapro Characters、VOCALOID 官方、Synthesizer V 官方、CeVIO 官方、AHS、Internet Co. 等。
   - 推荐用途：官方角色信息、软件信息、授权说明。
   - 不建议默认热链官方立绘。优先让用户上传，或者使用可授权素材 / 占位图。

6. MusicBrainz / Discogs / Spotify / Apple Music
   - 推荐用途：商业发行专辑信息补充。
   - 对术曲同人、Niconico 投稿、P 主别名不如 VocaDB 精准。

7. Bilibili
   - 适合中文术曲、搬运、中文字幕、中文虚拟歌姬内容。
   - 不建议在纯前端里依赖未公开接口。
   - 推荐保留“用户粘贴链接 / 手动补充 / 未来服务端代理”的路径。

数据源策略：

- 主搜索：本地 seed + 用户自定义 + VocaDB。
- 视频补全：VocaDB PV links + YouTube / Niconico。
- 中文内容：本地 seed + 手动链接 + 未来 Bilibili adapter。
- 立绘头像：默认占位图 + 用户上传；官方图只作为链接字段，不默认热链。

## 自动嵌入素材

应用要支持自动填充：

- 歌曲封面：优先 `coverUrl`，没有则允许粘贴 URL 或上传。
- 专辑封面：album 类型优先展示 `coverUrl`。
- 歌姬立绘：singer 类型优先展示 `portraitUrl`。
- P 主头像：producer 类型优先展示 `avatarUrl`。

无图片时：

- 使用美观占位图。
- 占位图可以用标题首字、分类符号、柔和图案。
- 不要整站都是同一种蓝紫渐变。

## 别名系统

每个条目支持多个别名：

- 搜索时别名必须可命中。
- 编辑弹窗里可以添加、删除别名。
- 展示时可选择显示主标题、原文名、中文名、日文名、英文名或某个别名。
- 长标题必须优雅截断或缩小，不能溢出。

## 视觉主题

至少做 4 个主题：

1. 黑白原图风
   - 白底、黑色细边框、粗黑标题，接近原图。

2. 清爽编辑风
   - 浅色背景、现代但克制、适合长期填写。

3. 深色舞台风
   - 深色背景、适合术曲氛围，但不要做成单一蓝紫色。

4. 杂志拼贴风
   - 更适合导出分享，图片更突出。

视觉约束：

- 卡片圆角不超过 8px，除非整体风格确实需要。
- 不要卡片套卡片。
- 不要装饰性渐变球、光斑。
- 文本不能溢出。
- 移动端必须可用。
- 导出 PNG 布局必须稳定。

## 导出与分享

必须实现：

- 导出 PNG：完整 5x6 表格，包含标题、作者、所有格子，高清，至少 2x scale。
- 导出 JSON：包含所有填写内容、自定义条目、主题设置。
- 导入 JSON：恢复表格。
- 自动保存：每次编辑后保存到 localStorage。
- 复制分享文本，格式类似：

```text
术曲个人喜好表
入坑作：xxx
最喜欢的：xxx
...
```

- 清空前二次确认。

## 交互细节

- 格子支持拖拽交换位置，或至少支持复制、清空、移动到其他分类。
- 每个格子有快捷操作：编辑、清空、复制。
- 搜索框输入防抖。
- 搜索为空时显示推荐条目。
- 保存成功有轻提示。
- 图片加载失败时显示占位图。
- 粘贴图片 URL 后立即预览。
- 上传图片太大时压缩或提示。
- Esc 关闭弹窗。
- Enter 搜索或保存。
- Tab 顺序合理。

## 推荐项目结构

```text
src/
  main.tsx
  App.tsx
  types.ts
  data/
    seedEntries.ts
    categories.ts
  services/
    search.ts
    storage.ts
    image.ts
    export.ts
    adapters/
      types.ts
      localAdapter.ts
      customEntryAdapter.ts
      mockExternalAdapter.ts
      vocadbAdapter.ts
  components/
    Toolbar.tsx
    PreferenceGrid.tsx
    PreferenceCell.tsx
    EntryEditorModal.tsx
    SearchPanel.tsx
    EntryForm.tsx
    ThemeSwitcher.tsx
    ImagePicker.tsx
    AliasEditor.tsx
    ExportPreview.tsx
  styles/
    themes.css
    globals.css
README.md
```

## 示例数据要求

至少包含这些方向，可自行补充到 40 条以上。

歌曲：

- みくみくにしてあげる♪
- メルト
- ワールドイズマイン
- 千本桜
- ローリンガール
- 砂の惑星
- ロキ
- ヒバナ
- ゴーストルール
- Tell Your World
- 炉心融解
- magnet
- ロストワンの号哭
- シャルル
- フォニイ
- 神っぽいな
- ヴァンパイア
- ラグトレイン
- 強風オールバック
- 匿名M

P 主：

- ika
- ryo
- wowaka
- DECO*27
- ハチ / 米津玄師
- Mitchie M
- kemu
- Neru
- ピノキオピー
- syudou
- Giga
- じん
- ぬゆり
- バルーン
- ツミキ
- 稲葉曇

歌姬：

- 初音ミク
- 鏡音リン
- 鏡音レン
- 巡音ルカ
- MEIKO
- KAITO
- GUMI
- IA
- 可不
- flower
- 重音テト
- 洛天依
- 星尘
- 乐正绫
- 言和

专辑：

- supercell
- EXIT TUNES PRESENTS Vocalogenesis
- Magical Mirai 相关专辑
- BOOTLEG
- Unhappy Refrain

图片 URL 不确定可用时，使用本地占位图逻辑，不要引入会导致构建失败的远程依赖。

## 工程要求

- TypeScript 类型严谨。
- 组件不要过度巨大。
- 搜索、存储、导出逻辑放 services。
- UI 状态清晰。
- 无真实 API key 也能完整跑。
- `npm install` 后 `npm run dev` 可运行。
- `npm run build` 必须通过。
- README 写清楚如何运行、如何填写、如何导入导出、如何接入真实数据源、数据结构说明。

## 多 Agent 交付要求

如果能使用多 agent，请按以下方式分工。

### Agent A：产品与交互

交付：

- 页面信息架构
- 30 个分类的状态结构
- 编辑弹窗流程
- 空状态、搜索结果、保存提示、清空确认
- 移动端交互

注意：

- 不要做 landing page。
- 第一屏就是可用表格。
- 每个格子都能独立编辑、清空、复制。

### Agent B：数据与搜索

交付：

- `types.ts`
- `categories.ts`
- `seedEntries.ts`
- Fuse 搜索服务
- 自定义条目存储
- adapter 接口
- VocaDB adapter 预留或可选实现

注意：

- 别名搜索必须工作。
- 数据源要可扩展。
- CORS 或 API key 问题不能阻塞本地可运行版本。

### Agent C：视觉与导出

交付：

- 4 套主题 CSS
- 响应式网格
- 导出专用固定 5 列布局
- 图片占位图
- 图片 object-fit 选项
- PNG 导出服务

注意：

- 文本不能溢出。
- 导出图要稳定。
- 不要单一蓝紫配色。

### Agent D：工程与验证

交付：

- package.json
- README
- 构建修复
- 验收清单
- 潜在 bug 修复建议

必须运行：

```bash
npm run build
```

如条件允许，再运行 lint 或基础交互检查。

## 验收标准

完成后自检：

- 能打开页面。
- 能点击任意格子编辑。
- 能搜索示例歌曲 / P 主 / 歌姬。
- 搜索别名能命中。
- 能上传图片。
- 能保存到本地。
- 刷新后数据还在。
- 能切换主题。
- 能导出 PNG。
- 能导出 JSON 并重新导入。
- `npm run build` 通过。
- README 完整。

## 最终回复格式

最后回复：

1. 已完成哪些功能
2. 如何运行
3. 构建是否通过
4. 主要文件结构
5. 后续可接入哪些真实 API

现在开始。直接实现，不要继续问需求。

