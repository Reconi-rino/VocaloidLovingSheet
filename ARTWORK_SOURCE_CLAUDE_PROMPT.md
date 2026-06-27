# 素材来源系统增强 Claude Prompt

把本文件粘贴给 Claude，用于强化“专辑封面 / 歌曲封面 / PV 缩略图 / P 主头像 / 歌姬立绘”的素材来源系统。

```text
请额外强化“专辑封面 / 歌曲封面 / PV 缩略图 / P 主头像 / 歌姬立绘”的素材来源系统。不要只做一个 coverUrl 输入框，而是实现一个可扩展的 artworkResolver 服务。

目标：
为每个条目自动寻找、选择、预览、缓存、替换图片素材，同时允许用户手动上传或粘贴 URL。应用必须在没有网络、没有 API key、远程图片 CORS 失败的情况下仍然可用。

请实现或预留以下结构：

type ArtworkProvider =
  | "upload"
  | "manual-url"
  | "vocadb"
  | "youtube"
  | "niconico"
  | "bilibili"
  | "album-fallback"
  | "musicbrainz"
  | "discogs"
  | "spotify"
  | "official-site"
  | "placeholder";

type ArtworkKind =
  | "song-cover"
  | "album-cover"
  | "video-thumbnail"
  | "producer-avatar"
  | "singer-portrait"
  | "generic";

interface ArtworkCandidate {
  id: string;
  provider: ArtworkProvider;
  kind: ArtworkKind;
  url?: string;
  dataUrl?: string;
  sourceUrl?: string;
  title?: string;
  attribution?: string;
  licenseNote?: string;
  confidence: number;
  corsSafe?: boolean;
  exportSafe?: boolean;
  width?: number;
  height?: number;
  createdAt: string;
}

interface ResolvedArtwork {
  selected?: ArtworkCandidate;
  candidates: ArtworkCandidate[];
  fallback: ArtworkCandidate;
  warnings: string[];
}

实现 services/artwork.ts，至少包含：

resolveArtwork(entry, context): Promise<ResolvedArtwork>
createPlaceholderArtwork(entry, kind): ArtworkCandidate
normalizeArtworkCandidate(raw): ArtworkCandidate
rankArtworkCandidates(candidates): ArtworkCandidate[]
tryCacheRemoteImage(candidate): Promise<ArtworkCandidate>
validateImageUrl(url): Promise<{ ok: boolean; corsSafe: boolean; width?: number; height?: number; warning?: string }>

素材来源优先级：

一、歌曲封面 song-cover

优先级：
1. 用户上传图片 upload
2. 用户手动粘贴图片 URL manual-url
3. VocaDB song 主图 vocadb
4. 原投稿视频缩略图 video-thumbnail
   - 如果 VocaDB 条目有关联 PV，尝试从 YouTube / Niconico / Bilibili 链接补缩略图
5. 关联专辑封面 album-fallback
6. 本地生成占位图 placeholder

说明：
很多术曲没有严格意义上的“歌曲封面”，所以 PV 缩略图和专辑封面都应该作为合理 fallback。UI 上要显示图片来源，例如“来自 VocaDB”“来自 YouTube 缩略图”“来自专辑封面”“用户上传”。

二、专辑封面 album-cover

优先级：
1. 用户上传图片 upload
2. 用户手动粘贴图片 URL manual-url
3. VocaDB album 主图 vocadb
4. MusicBrainz / Cover Art Archive musicbrainz
5. Discogs / Spotify / Apple Music 预留 adapter，不要求第一版真实接通
6. 本地生成占位图 placeholder

说明：
VocaDB 是术曲专辑的首选来源。MusicBrainz / Cover Art Archive 适合商业发行或标准 metadata 专辑，但对同人术曲覆盖不一定完整。

三、P 主头像 producer-avatar

优先级：
1. 用户上传图片
2. 用户手动粘贴 URL
3. VocaDB artist 图片
4. YouTube channel thumbnail，如果有明确频道链接
5. 本地生成占位图

注意：
不要默认抓社交媒体头像，除非用户粘贴链接。头像版权和防盗链不稳定。

四、歌姬立绘 singer-portrait

优先级：
1. 用户上传图片
2. 用户手动粘贴 URL
3. 本地 seed 数据中明确可用的官方 / 授权图片链接
4. 官方站点链接只作为 sourceLink，不默认热链
5. 本地生成占位图

注意：
不要默认热链 Crypton / Piapro / VOCALOID / SynthV / CeVIO 官方立绘。立绘版权敏感，第一版应优先让用户上传，或只保存官方页面链接。没有图时使用漂亮占位图。

五、PV 缩略图 video-thumbnail

来源：
1. YouTube Data API，如果配置了 API key
2. YouTube oEmbed 或根据 video id 构造缩略图 URL，作为无 key fallback
3. Niconico Snapshot Search API 或视频页面 metadata，预留 adapter
4. Bilibili 手动链接或未来服务端代理，第一版不要强依赖未公开接口

实现 services/adapters/artwork/ 目录：

services/
  artwork.ts
  adapters/
    artwork/
      types.ts
      vocadbArtworkAdapter.ts
      youtubeArtworkAdapter.ts
      niconicoArtworkAdapter.ts
      musicbrainzArtworkAdapter.ts
      manualArtworkAdapter.ts
      placeholderArtworkAdapter.ts

VocaDB：
- 作为主数据源，优先用于歌曲、P 主、专辑。
- 使用 VocaDB Web API / OpenAPI 文档。
- 如果前端直连有 CORS 或字段不确定问题，不要阻塞应用；实现 adapter 接口、mock 数据和 README 说明。
- 推荐入口：
  - https://vocadb.net/
  - https://vocadb.net/swagger/index.html
  - https://github.com/VocaDB/vocadb

YouTube：
- 用于 PV 缩略图补全。
- 如果有 API key，可使用 YouTube Data API。
- 如果没有 API key，可从 video id 生成缩略图候选：
  - https://img.youtube.com/vi/{videoId}/hqdefault.jpg
  - https://img.youtube.com/vi/{videoId}/maxresdefault.jpg
- 这些缩略图 URL 可能存在 CORS / 导出问题，因此必须标记 corsSafe/exportSafe。
- 官方文档：
  - https://developers.google.com/youtube/v3/docs/search/list

MusicBrainz / Cover Art Archive：
- 用于补商业发行专辑封面。
- 不作为术曲主来源。
- 预留 adapter 即可，第一版可以 mock。
- README 写明后续可通过 artist + album title 查询 MusicBrainz release，再用 Cover Art Archive 取封面。

Niconico：
- 用于补 Niconico 原投稿缩略图。
- 由于 API 和 CORS 可能变化，第一版可以实现 URL 解析和 adapter 骨架。
- README 写明需要确认当前 Snapshot Search API endpoint、User-Agent 要求、CORS 及使用限制。

Bilibili：
- 第一版只支持用户手动粘贴链接和图片 URL。
- 不要依赖未公开接口。
- 未来如有后端，可以做 server proxy adapter。

CORS 和 PNG 导出要求非常重要：

远程图片可能导致 html-to-image / dom-to-image 导出 PNG 失败。请实现以下策略：

1. 用户上传的图片必须是 exportSafe。
2. 手动 URL 和远程 API 图片需要 validateImageUrl。
3. 能 fetch 成 blob 的远程图片，转成 dataUrl 缓存，提高导出成功率。
4. 如果因为 CORS 不能缓存，仍允许界面预览，但标记 exportSafe=false。
5. 导出 PNG 前检查所有格子图片：
   - 如果有 exportSafe=false，提示用户“部分远程图片可能无法导出，建议上传本地图片或使用缓存副本”。
   - 不要直接让导出崩溃。
6. 图片加载失败时自动切换到 placeholder。
7. 所有 ArtworkCandidate 保留 sourceUrl 和 provider，方便用户知道图片从哪里来。

UI 要增加“素材来源面板”：

在编辑弹窗里，图片区域不要只是一个输入框。请加入：
- 当前选中图片预览
- 来源标签，例如“用户上传 / VocaDB / YouTube 缩略图 / 专辑封面 / 占位图”
- “查找素材”按钮
- “换一张”或候选图列表
- “粘贴图片 URL”
- “上传本地图片”
- “移除图片”
- “使用占位图”
- CORS / 导出安全提示
- 图片 fit 选项：裁切、完整显示、居中

候选图列表展示：
- 缩略图
- 来源 provider
- 标题
- 置信度 confidence
- 是否适合导出 exportSafe
- 来源链接 sourceUrl

占位图要求：
- 根据 entry 类型、标题、歌姬 / P 主 / 专辑信息生成稳定占位图。
- 不要空白。
- 不要整站单一蓝紫渐变。
- 可以用多套配色，按 entry id hash 稳定选择。
- 占位图必须适合 PNG 导出。

数据结构要把 artwork 保存进 Entry 或 Cell：

建议 Entry 增加：
artwork?: {
  selected?: ArtworkCandidate;
  candidates?: ArtworkCandidate[];
  imageFit?: "cover" | "contain" | "center";
};

或者 Cell 增加 cellArtwork override，允许同一个条目在不同格子用不同图片。

推荐：
- Entry 保存默认素材。
- PreferenceCellData 保存 override 素材。
- 当前格子优先使用 cell override，其次 entry artwork，其次 resolver fallback。

请同步更新：
- TypeScript types
- storage schema
- JSON import/export
- README
- seed data
- 编辑弹窗
- PNG export preflight

验收标准：
1. 歌曲条目能显示封面或 PV 缩略图或专辑 fallback。
2. 专辑条目能显示专辑封面或占位图。
3. P 主条目能显示头像或占位图。
4. 歌姬条目能显示立绘或占位图。
5. 用户上传图片后刷新仍保留。
6. 粘贴图片 URL 后立即预览。
7. 图片加载失败不会破坏 UI。
8. 导出 PNG 前能发现潜在 CORS 风险。
9. exportSafe 图片能正常进入 PNG。
10. JSON 导入导出能保留素材选择和来源信息。
```

