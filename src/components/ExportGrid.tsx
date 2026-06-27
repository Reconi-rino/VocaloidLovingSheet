import React from "react";
import type { PreferenceCellData } from "../types";
import { getArtworkUrl, createPlaceholderArtwork, getCellImageUrl } from "../services/artwork";

interface ExportGridProps {
  title: string;
  author?: string;
  cells: Record<string, PreferenceCellData>;
}

const CELL_SIZE = 120;

const ExportGrid = React.forwardRef<HTMLDivElement, ExportGridProps>(
  ({ title, author, cells }, ref) => {
    const cellEntries = Object.values(cells);

    return (
      <div
        ref={ref}
        style={{
          background: "var(--page-bg)",
          color: "var(--page-text)",
          padding: 24,
          width: 5 * (CELL_SIZE + 8) + 48,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
            {title}
          </div>
          {author && (
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
              {author}
            </div>
          )}
        </div>

        {/* 5-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(5, ${CELL_SIZE}px)`,
            gap: 8,
            justifyContent: "center",
          }}
        >
          {cellEntries.map((cell) => {
            const { entry, categoryLabel } = cell;
            const imageUrl = getCellImageUrl(cell);
            const placeholderUrl = entry
              ? getArtworkUrl(
                  createPlaceholderArtwork(
                    entry,
                    entry.type === "singer"
                      ? "singer-portrait"
                      : entry.type === "producer"
                        ? "producer-avatar"
                        : entry.type === "album"
                          ? "album-cover"
                          : "song-cover",
                  ),
                )
              : undefined;
            const displayUrl = imageUrl || placeholderUrl;
            const fallbackChar = entry?.title?.charAt(0) || categoryLabel.charAt(0);

            return (
              <div
                key={cell.categoryId}
                style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                {/* Square image box */}
                <div
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    borderRadius: 6,
                    overflow: "hidden",
                    position: "relative",
                    background: "var(--cell-bg)",
                    border: "1px solid var(--cell-border)",
                  }}
                >
                  {displayUrl ? (
                    <img
                      src={displayUrl}
                      alt=""
                      data-export-placeholder={placeholderUrl}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: entry?.type === "singer" ? "top" : "center",
                        display: "block",
                      }}
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        if (placeholderUrl && t.src !== placeholderUrl) {
                          t.src = placeholderUrl;
                        } else {
                          t.style.display = "none";
                        }
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 36,
                        fontWeight: 700,
                        color: "var(--accent)",
                      }}
                    >
                      {fallbackChar}
                    </div>
                  )}

                  {/* Category label overlay at top */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      padding: "2px 4px",
                      fontSize: 9,
                      fontWeight: 700,
                      textAlign: "center",
                      background: "var(--cell-label-bg)",
                      color: "var(--cell-label-text)",
                    }}
                  >
                    {categoryLabel}
                  </div>
                </div>

                {/* Name below the square */}
                <div
                  style={{
                    width: CELL_SIZE,
                    textAlign: "center",
                    marginTop: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry?.displayTitle || entry?.title || ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

ExportGrid.displayName = "ExportGrid";
export default ExportGrid;
