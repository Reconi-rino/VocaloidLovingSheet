import React from "react";
import type { PreferenceCellData } from "../types";
import { getArtworkUrl } from "../services/artwork";
import { createPlaceholderArtwork } from "../services/artwork";
import { X, Pencil, Copy } from "lucide-react";

interface PreferenceCellProps {
  data: PreferenceCellData;
  onClick: () => void;
  onClear?: () => void;
  onCopy?: () => void;
}

function getImageUrl(data: PreferenceCellData): string | undefined {
  const { entry, cellArtwork } = data;

  // 1. Cell override artwork
  if (cellArtwork) {
    const url = getArtworkUrl(cellArtwork);
    if (url) return url;
  }

  // 2. Entry artwork selected
  if (entry?.artwork?.selected) {
    const url = getArtworkUrl(entry.artwork.selected);
    if (url) return url;
  }

  // 3. Legacy coverUrl / avatarUrl / portraitUrl
  if (entry) {
    return entry.coverUrl || entry.avatarUrl || entry.portraitUrl;
  }

  return undefined;
}

const PreferenceCell: React.FC<PreferenceCellProps> = ({
  data,
  onClick,
  onClear,
  onCopy,
}) => {
  const { entry, categoryLabel, imageFit } = data;
  const fit: React.CSSProperties["objectFit"] =
    imageFit === "cover" || imageFit === "contain" ? imageFit : "cover";
  const hasEntry = !!entry;

  const imageUrl = getImageUrl(data);

  // Generate placeholder for empty cells with entry
  const placeholderUrl = React.useMemo(() => {
    if (!entry || imageUrl) return undefined;
    return getArtworkUrl(createPlaceholderArtwork(entry,
      entry.type === "singer" ? "singer-portrait" :
      entry.type === "producer" ? "producer-avatar" :
      entry.type === "album" ? "album-cover" : "song-cover"
    ));
  }, [entry, imageUrl]);

  const displayUrl = imageUrl || placeholderUrl;

  const subtitle = React.useMemo(() => {
    if (!entry) return "";
    const parts: string[] = [];
    if (entry.producers.length > 0) parts.push(entry.producers.join(", "));
    if (entry.singers.length > 0) parts.push(entry.singers.join(", "));
    return parts.join(" / ");
  }, [entry]);

  const fallbackChar = entry?.title
    ? entry.title.charAt(0)
    : categoryLabel.charAt(0);

  return (
    <div
      data-cell={data.categoryId}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border transition-all hover:scale-[1.02]"
      style={{
        background: "var(--cell-bg)",
        borderColor: "var(--cell-border)",
        color: "var(--cell-text)",
        borderRadius: "var(--cell-radius, 8px)",
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Category label */}
      <div
        className="shrink-0 px-2 py-1 text-center text-xs font-bold"
        style={{
          background: "var(--cell-label-bg)",
          color: "var(--cell-label-text)",
        }}
      >
        {categoryLabel}
      </div>

      {/* Content area */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center p-2">
        {hasEntry ? (
          <>
            {displayUrl && (
              <div className="mb-1 h-16 w-full overflow-hidden rounded">
                <img
                  src={displayUrl}
                  alt={entry.title}
                  className="h-full w-full"
                  style={{ objectFit: fit }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (placeholderUrl && target.src !== placeholderUrl) {
                      target.src = placeholderUrl;
                    } else {
                      target.style.display = "none";
                    }
                  }}
                />
              </div>
            )}
            {!displayUrl && (
              <div
                className="mb-1 flex h-12 w-12 items-center justify-center rounded text-lg font-bold"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-text, #fff)",
                }}
              >
                {fallbackChar}
              </div>
            )}
            <p className="w-full truncate text-center text-sm font-medium">
              {entry.displayTitle || entry.title}
            </p>
            {subtitle && (
              <p className="mt-0.5 w-full truncate text-center text-[10px]" style={{ opacity: 0.7 }}>
                {subtitle}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 py-3" style={{ opacity: 0.5 }}>
            <Pencil size={16} className="opacity-40" />
            <span className="text-xs">点击选择</span>
            <span className="text-[10px] opacity-60">/ 自定义填写</span>
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      {hasEntry && (
        <div className="absolute right-1 top-8 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onCopy && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className="rounded p-1 shadow-sm transition-opacity hover:opacity-80"
              style={{ background: "var(--cell-bg)", color: "var(--cell-text)", opacity: 0.9 }}
              title="复制信息"
            >
              <Copy size={12} />
            </button>
          )}
          {onClear && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="rounded p-1 text-red-400 shadow-sm transition-opacity hover:opacity-80"
              style={{ background: "var(--cell-bg)", opacity: 0.9 }}
              title="清空格子"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PreferenceCell;
