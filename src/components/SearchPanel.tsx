import React from "react";
import type { Entry, EntryType } from "../types";
import { Search, Music, User, Mic, Disc3 } from "lucide-react";

interface SearchPanelProps {
  query: string;
  entries: Entry[];
  onSelect: (entry: Entry) => void;
  typeFilter?: EntryType;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const TYPE_ICONS: Record<EntryType, React.ReactNode> = {
  song: <Music size={14} />,
  producer: <User size={14} />,
  singer: <Mic size={14} />,
  album: <Disc3 size={14} />,
  custom: <Search size={14} />,
};

const TYPE_LABELS: Record<EntryType, string> = {
  song: "歌曲",
  producer: "P主",
  singer: "歌姬",
  album: "专辑",
  custom: "自定义",
};

const SearchPanel: React.FC<SearchPanelProps> = ({
  query,
  entries,
  onSelect,
  typeFilter,
  loading = false,
  hasMore = false,
  onLoadMore,
}) => {
  const filtered = React.useMemo(() => {
    if (!typeFilter) return entries;
    return entries.filter((e) => e.type === typeFilter);
  }, [entries, typeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm" style={{ opacity: 0.5 }}>
        <div
          className="mr-2 h-4 w-4 animate-spin rounded-full border-2"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
        搜索中...
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="py-6 text-center text-sm" style={{ opacity: 0.5 }}>
        <Search size={24} className="mx-auto mb-2 opacity-50" />
        <p>输入关键词搜索（支持罗马音）</p>
        <p className="mt-1 text-xs">支持标题、别名、罗马音、P主、歌姬等</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-6 text-center text-sm" style={{ opacity: 0.5 }}>
        <p>未找到匹配结果</p>
        <p className="mt-1 text-xs">尝试更换关键词、罗马音，或手动填写信息</p>
      </div>
    );
  }

  return (
    <div className="max-h-64 space-y-1 overflow-y-auto">
      {filtered.map((entry) => {
        const imageUrl = entry.coverUrl || entry.avatarUrl || entry.portraitUrl;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors"
            style={{ color: "var(--page-text)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--result-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {/* Thumbnail */}
            <div
              className="h-10 w-10 shrink-0 overflow-hidden rounded"
              style={{ background: "var(--result-bg)" }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ opacity: 0.4 }}>
                  {TYPE_ICONS[entry.type]}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px]"
                  style={{ background: "var(--accent)", color: "var(--accent-text, #fff)" }}
                >
                  {TYPE_LABELS[entry.type]}
                </span>
                <span className="truncate text-sm font-medium">
                  {entry.displayTitle || entry.title}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs" style={{ opacity: 0.6 }}>
                {entry.producers.length > 0 && (
                  <span>P: {entry.producers.join(", ")}</span>
                )}
                {entry.producers.length > 0 && entry.singers.length > 0 && (
                  <span> / </span>
                )}
                {entry.singers.length > 0 && (
                  <span>S: {entry.singers.join(", ")}</span>
                )}
              </div>
              {entry.aliases.length > 0 && (
                <div className="mt-0.5 truncate text-[10px]" style={{ opacity: 0.4 }}>
                  别名: {entry.aliases.join(", ")}
                </div>
              )}
            </div>

            <span
              className="shrink-0 rounded border px-2 py-0.5 text-xs"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              使用
            </span>
          </button>
        );
      })}

      {/* Load more */}
      {hasMore && onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="w-full rounded-md py-2 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ color: "var(--accent)" }}
        >
          {loading ? "加载中..." : "加载更多结果 ↓"}
        </button>
      )}
    </div>
  );
};

export default SearchPanel;
