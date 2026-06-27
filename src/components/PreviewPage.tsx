import React from "react";
import type { PreferenceCellData } from "../types";
import { categories } from "../data/categories";
import { loadSheet, loadTheme, loadMode } from "../services/storage";
import ExportGrid from "./ExportGrid";
import type { ThemeName, DisplayMode } from "./ThemeSwitcher";

function buildDefaultCells(): Record<string, PreferenceCellData> {
  const cells: Record<string, PreferenceCellData> = {};
  for (const cat of categories) {
    cells[cat.id] = { categoryId: cat.id, categoryLabel: cat.label };
  }
  return cells;
}

const PreviewPage: React.FC = () => {
  const [theme, setTheme] = React.useState<ThemeName>("miku");
  const [mode, setMode] = React.useState<DisplayMode>("dark");
  const [title, setTitle] = React.useState("术曲个人喜好表");
  const [author, setAuthor] = React.useState("");
  const [cells, setCells] = React.useState<Record<string, PreferenceCellData>>(buildDefaultCells);

  React.useEffect(() => {
    const savedTheme = loadTheme();
    if (savedTheme) setTheme(savedTheme as ThemeName);

    const savedMode = loadMode();
    if (savedMode === "light" || savedMode === "dark") setMode(savedMode);

    const savedSheet = loadSheet();
    if (savedSheet) setCells({ ...buildDefaultCells(), ...savedSheet });

    const raw = localStorage.getItem("vocaloid-title");
    if (raw) setTitle(raw);

    const rawAuthor = localStorage.getItem("vocaloid-author");
    if (rawAuthor) setAuthor(rawAuthor);
  }, []);

  return (
    <div
      data-theme={theme}
      data-mode={mode}
      className="flex min-h-screen flex-col items-center transition-colors"
      style={{ background: "var(--page-bg)", color: "var(--page-text)" }}
    >
      {/* Top bar */}
      <div className="flex w-full items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => {
            window.location.hash = "";
            window.location.reload();
          }}
          className="rounded-md border px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            background: "var(--btn-bg)",
            color: "var(--btn-text)",
            borderColor: "var(--btn-border)",
          }}
        >
          返回编辑
        </button>
        <p className="text-xs" style={{ opacity: 0.5 }}>
          按 F11 全屏后截图效果最佳
        </p>
      </div>

      {/* Grid */}
      <div className="flex flex-1 items-center justify-center px-4 pb-8">
        <ExportGrid title={title} author={author} cells={cells} />
      </div>
    </div>
  );
};

export default PreviewPage;
