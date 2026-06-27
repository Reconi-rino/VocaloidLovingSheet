import React from "react";
import type { Entry, EntryType, PreferenceCellData } from "../types";
import { X, Search, Globe } from "lucide-react";
import SearchPanel from "./SearchPanel";
import EntryForm from "./EntryForm";
import { searchEntries, searchOnline, matchesPinyin } from "../services/search";

interface EntryEditorModalProps {
  cellData: PreferenceCellData;
  allEntries: Entry[];
  onSave: (entry: Entry, imageFit?: "cover" | "contain" | "none") => void;
  onClose: () => void;
  onSaveAsCustom: (entry: Entry) => void;
}

const TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: "song", label: "歌曲" },
  { value: "producer", label: "P主" },
  { value: "singer", label: "歌姬" },
  { value: "album", label: "专辑" },
  { value: "custom", label: "自定义" },
];

const EntryEditorModal: React.FC<EntryEditorModalProps> = ({
  cellData,
  allEntries,
  onSave,
  onClose,
  onSaveAsCustom,
}) => {
  const [typeFilter, setTypeFilter] = React.useState<EntryType>(
    cellData.entry?.type || "song"
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [selectedEntry, setSelectedEntry] = React.useState<Partial<Entry> | null>(
    cellData.entry ? { ...cellData.entry } : null
  );
  const [imageFit, setImageFit] = React.useState<"cover" | "contain" | "none">(
    cellData.imageFit || "cover"
  );
  const [isDirty, setIsDirty] = React.useState(false);
  const [showManualEdit, setShowManualEdit] = React.useState(!!cellData.entry);

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Local search with Fuse.js (supports romaji via aliases)
  // When searching songs, also match by producer/singer name
  const searchResults = React.useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();

    // Direct type match
    const directMatches = allEntries.filter((e) => e.type === typeFilter);
    const results = searchEntries(debouncedQuery, directMatches);
    const resultIds = new Set(results.map((e) => e.id));

    // When searching songs/albums, also find by producer/singer name
    if (typeFilter === "song" || typeFilter === "album") {
      // Find matching producers/singers
      const artists = allEntries.filter((e) => e.type === "producer" || e.type === "singer");
      const matchedArtists = artists.filter((a) => {
        const searchable = [a.title, a.displayTitle, a.chineseTitle, a.englishTitle, ...a.aliases]
          .filter(Boolean).join(" ");
        return matchesPinyin(q, searchable);
      });

      if (matchedArtists.length > 0) {
        const artistNames = new Set(matchedArtists.map((a) => a.title));
        const songsByArtist = allEntries.filter((e) => {
          if (e.type !== typeFilter || resultIds.has(e.id)) return false;
          return e.producers.some((p) => artistNames.has(p)) ||
                 e.singers.some((s) => artistNames.has(s));
        });
        results.push(...songsByArtist);
      }
    }

    return results;
  }, [debouncedQuery, allEntries, typeFilter]);

  // Online VocaDB search
  const [onlineResults, setOnlineResults] = React.useState<Entry[]>([]);
  const [onlineLoading, setOnlineLoading] = React.useState(false);

  React.useEffect(() => {
    if (!debouncedQuery.trim() || typeFilter === "custom") {
      setOnlineResults([]);
      return;
    }
    setOnlineLoading(true);
    const timeout = setTimeout(() => {
      searchOnline(debouncedQuery, typeFilter)
        .then((results) => {
          const localIds = new Set(searchResults.map((e) => e.id));
          setOnlineResults(results.filter((e) => !localIds.has(e.id)));
        })
        .catch(() => setOnlineResults([]))
        .finally(() => setOnlineLoading(false));
    }, 500);
    return () => clearTimeout(timeout);
  }, [debouncedQuery, typeFilter, searchResults]);

  const combinedResults = React.useMemo(() => {
    return [...searchResults, ...onlineResults];
  }, [searchResults, onlineResults]);

  // Close on Esc
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDirty) {
          if (window.confirm("有未保存的更改，确定要关闭吗？")) {
            onClose();
          }
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, onClose]);

  const handleSelectFromSearch = (entry: Entry) => {
    setSelectedEntry({ ...entry });
    setShowManualEdit(true);
    setIsDirty(true);
  };

  const handleFormChange = (updated: Partial<Entry>) => {
    setSelectedEntry(updated);
    setIsDirty(true);
  };

  const handleSaveToCell = () => {
    if (!selectedEntry?.title) {
      alert("请填写标题");
      return;
    }
    const entry: Entry = {
      id: selectedEntry.id || `custom-${Date.now()}`,
      type: selectedEntry.type || typeFilter,
      title: selectedEntry.title,
      originalTitle: selectedEntry.originalTitle,
      displayTitle: selectedEntry.displayTitle,
      chineseTitle: selectedEntry.chineseTitle,
      japaneseTitle: selectedEntry.japaneseTitle,
      englishTitle: selectedEntry.englishTitle,
      aliases: selectedEntry.aliases || [],
      producers: selectedEntry.producers || [],
      singers: selectedEntry.singers || [],
      album: selectedEntry.album,
      year: selectedEntry.year,
      description: selectedEntry.description,
      coverUrl: selectedEntry.coverUrl,
      avatarUrl: selectedEntry.avatarUrl,
      portraitUrl: selectedEntry.portraitUrl,
      sourceLinks: selectedEntry.sourceLinks || [],
      tags: selectedEntry.tags || [],
      createdAt: selectedEntry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(entry, imageFit);
  };

  const handleSaveAsCustom = () => {
    if (!selectedEntry?.title) {
      alert("请填写标题");
      return;
    }
    const entry: Entry = {
      id: `custom-${Date.now()}`,
      type: "custom",
      title: selectedEntry.title,
      originalTitle: selectedEntry.originalTitle,
      displayTitle: selectedEntry.displayTitle,
      chineseTitle: selectedEntry.chineseTitle,
      japaneseTitle: selectedEntry.japaneseTitle,
      englishTitle: selectedEntry.englishTitle,
      aliases: selectedEntry.aliases || [],
      producers: selectedEntry.producers || [],
      singers: selectedEntry.singers || [],
      album: selectedEntry.album,
      year: selectedEntry.year,
      description: selectedEntry.description,
      coverUrl: selectedEntry.coverUrl,
      avatarUrl: selectedEntry.avatarUrl,
      portraitUrl: selectedEntry.portraitUrl,
      sourceLinks: selectedEntry.sourceLinks || [],
      tags: selectedEntry.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveAsCustom(entry);
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm("有未保存的更改，确定要关闭吗？")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10"
      style={{ background: "var(--modal-overlay)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg border shadow-xl"
        style={{ background: "var(--modal-bg)", borderColor: "var(--accent)", color: "var(--page-text)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: "var(--accent)", background: "var(--cell-label-bg)", color: "var(--cell-label-text)" }}
        >
          <h2 className="text-base font-semibold">
            编辑: {cellData.categoryLabel}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 transition-opacity hover:opacity-70"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4" style={{ background: "var(--modal-bg)" }}>
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ opacity: 0.7 }}>
              搜索类型:
            </label>
            <div className="flex gap-1">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTypeFilter(opt.value);
                    setSearchQuery("");
                  }}
                  className="rounded-md px-2.5 py-1 text-sm transition-colors"
                  style={{
                    background: typeFilter === opt.value ? "var(--accent)" : "var(--result-bg)",
                    color: typeFilter === opt.value ? "var(--accent-text, #fff)" : "var(--page-text)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setDebouncedQuery(searchQuery);
                }
              }}
              placeholder="搜索歌曲、P主、歌姬、罗马音..."
              className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--page-text)" }}
              autoFocus
            />
          </div>

          {/* Search results */}
          <div className="rounded-md border" style={{ borderColor: "var(--accent)", background: "var(--result-bg)" }}>
            <SearchPanel
              query={debouncedQuery}
              entries={combinedResults}
              onSelect={handleSelectFromSearch}
              typeFilter={typeFilter}
              loading={onlineLoading}
            />
            {onlineResults.length > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 text-[10px]" style={{ opacity: 0.4 }}>
                <Globe size={10} />
                <span>含 VocaDB 在线结果</span>
              </div>
            )}
          </div>

          {/* Toggle manual edit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowManualEdit(!showManualEdit)}
              className="text-sm"
              style={{ color: "var(--accent)" }}
            >
              {showManualEdit ? "收起手动编辑" : "展开手动编辑"}
            </button>
            {!selectedEntry && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEntry({ type: typeFilter, aliases: [], producers: [], singers: [], sourceLinks: [], tags: [] });
                  setShowManualEdit(true);
                  setIsDirty(true);
                }}
                className="text-sm"
                style={{ color: "var(--accent)" }}
              >
                + 创建新条目
              </button>
            )}
          </div>

          {/* Manual edit form */}
          {showManualEdit && selectedEntry && (
            <div className="rounded-md border p-4" style={{ borderColor: "var(--accent)", background: "var(--cell-bg)" }}>
              <EntryForm entry={selectedEntry} onChange={handleFormChange} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "var(--accent)", background: "var(--modal-bg)" }}>
          <div className="flex items-center gap-2">
            {selectedEntry && (
              <label className="flex items-center gap-1 text-sm" style={{ opacity: 0.7 }}>
                图片适配:
                <select
                  value={imageFit}
                  onChange={(e) => {
                    setImageFit(
                      e.target.value as "cover" | "contain" | "none"
                    );
                    setIsDirty(true);
                  }}
                  className="rounded border px-1.5 py-0.5 text-sm"
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--page-text)" }}
                >
                  <option value="cover">裁剪填充</option>
                  <option value="contain">完整显示</option>
                  <option value="center">居中原尺寸</option>
                </select>
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border px-4 py-1.5 text-sm transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--accent)", color: "var(--page-text)" }}
            >
              取消
            </button>
            {selectedEntry && (
              <>
                <button
                  type="button"
                  onClick={handleSaveAsCustom}
                  className="rounded-md border px-4 py-1.5 text-sm transition-opacity hover:opacity-80"
                  style={{ borderColor: "var(--accent)", background: "transparent", color: "var(--accent)" }}
                >
                  保存为我的条目
                </button>
                <button
                  type="button"
                  onClick={handleSaveToCell}
                  className="rounded-md px-4 py-1.5 text-sm transition-opacity hover:opacity-80"
                  style={{ background: "var(--btn-bg)", color: "var(--btn-text)" }}
                >
                  仅用于当前格子
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryEditorModal;
