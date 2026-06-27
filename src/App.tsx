import "./styles/globals.css";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Entry, PreferenceCellData } from "./types";
import { categories } from "./data/categories";
import { seedEntries } from "./data/seedEntries";
import {
  saveSheet,
  loadSheet,
  saveCustomEntries,
  loadCustomEntries,
  saveTheme,
  loadTheme,
  saveMode,
  loadMode,
  saveProxy,
  loadProxy,
  clearAll,
} from "./services/storage";
import { setProxyEnabled } from "./services/adapters/vocadbAdapter";
import {
  exportToPNG,
  exportToJSON,
  importFromJSON,
  generateShareText,
} from "./services/export";

import Toolbar from "./components/Toolbar";
import PreferenceGrid from "./components/PreferenceGrid";
import ExportGrid from "./components/ExportGrid";
import EntryEditorModal from "./components/EntryEditorModal";
import type { ThemeName, DisplayMode } from "./components/ThemeSwitcher";

/* ---------- helpers ---------- */

function buildDefaultCells(): Record<string, PreferenceCellData> {
  const cells: Record<string, PreferenceCellData> = {};
  for (const cat of categories) {
    cells[cat.id] = { categoryId: cat.id, categoryLabel: cat.label };
  }
  return cells;
}

function mergeCells(
  defaults: Record<string, PreferenceCellData>,
  saved: Record<string, PreferenceCellData> | undefined,
): Record<string, PreferenceCellData> {
  if (!saved) return defaults;
  return { ...defaults, ...saved };
}

/* ---------- App component ---------- */

function App() {
  /* -- state -- */
  const [theme, setTheme] = useState<ThemeName>("miku");
  const [mode, setMode] = useState<DisplayMode>("dark");
  const [proxy, setProxy] = useState(false);
  const [title, setTitle] = useState("术曲个人喜好表");
  const [author, setAuthor] = useState("");
  const [cells, setCells] = useState<Record<string, PreferenceCellData>>(
    buildDefaultCells,
  );
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [customEntries, setCustomEntries] = useState<Entry[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  /* -- refs -- */
  const gridRef = useRef<HTMLDivElement>(null);
  const exportGridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* -- derived -- */
  const allEntries = [...seedEntries, ...customEntries];

  /* -- toast helper -- */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  /* ============ mount: load saved data ============ */
  useEffect(() => {
    try {
      const savedTheme = loadTheme();
      if (savedTheme) setTheme(savedTheme as ThemeName);

      const savedMode = loadMode();
      if (savedMode === "light" || savedMode === "dark") setMode(savedMode);

      const savedProxy = loadProxy();
      if (savedProxy) {
        setProxy(true);
        setProxyEnabled(true);
      }

      const savedSheet = loadSheet();
      setCells(mergeCells(buildDefaultCells(), savedSheet ?? undefined));

      const savedCustom = loadCustomEntries();
      if (savedCustom.length > 0) setCustomEntries(savedCustom);
    } catch (err) {
      console.error("Failed to load saved data:", err);
    }
    setLoaded(true);
  }, []);

  /* ============ auto-save on every change ============ */
  useEffect(() => {
    if (!loaded) return;
    try {
      saveSheet(cells);
    } catch (err) {
      console.error("Failed to save sheet:", err);
    }
  }, [loaded, cells]);

  useEffect(() => {
    if (!loaded) return;
    try {
      saveCustomEntries(customEntries);
    } catch (err) {
      console.error("Failed to save custom entries:", err);
    }
  }, [loaded, customEntries]);

  useEffect(() => {
    if (!loaded) return;
    try {
      saveTheme(theme);
    } catch (err) {
      console.error("Failed to save theme:", err);
    }
  }, [loaded, theme]);

  useEffect(() => {
    if (!loaded) return;
    try {
      saveMode(mode);
    } catch (err) {
      console.error("Failed to save mode:", err);
    }
  }, [loaded, mode]);

  useEffect(() => {
    if (!loaded) return;
    try {
      saveProxy(proxy);
      setProxyEnabled(proxy);
    } catch (err) {
      console.error("Failed to save proxy:", err);
    }
  }, [loaded, proxy]);

  /* ============ cell interactions ============ */
  const handleCellClick = useCallback((categoryId: string) => {
    setEditingCellId(categoryId);
  }, []);

  const handleSaveToCell = useCallback(
    (entry: Entry, imageFit?: "cover" | "contain" | "none") => {
      if (!editingCellId) return;
      const cat = categories.find((c) => c.id === editingCellId);
      setCells((prev) => ({
        ...prev,
        [editingCellId]: {
          categoryId: editingCellId,
          categoryLabel: cat?.label ?? editingCellId,
          entry,
          imageFit,
        },
      }));
      setEditingCellId(null);
      showToast("已保存");
    },
    [editingCellId, showToast],
  );

  const handleSaveAsCustom = useCallback(
    (entry: Entry) => {
      setCustomEntries((prev) => {
        const exists = prev.findIndex((e) => e.id === entry.id);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = entry;
          return updated;
        }
        return [...prev, entry];
      });
      showToast("已保存为自定义条目");
    },
    [showToast],
  );

  const handleEditorClose = useCallback(() => {
    setEditingCellId(null);
  }, []);

  /* ============ toolbar actions ============ */

  /* -- save (manual trigger) -- */
  const handleSave = useCallback(() => {
    try {
      saveSheet(cells);
      saveCustomEntries(customEntries);
      saveTheme(theme);
      showToast("已保存");
    } catch (err) {
      console.error("Save failed:", err);
      showToast("保存失败");
    }
  }, [cells, customEntries, theme, showToast]);

  /* -- export PNG -- */
  const handleExportPng = useCallback(async () => {
    if (!exportGridRef.current) return;
    try {
      await exportToPNG(exportGridRef.current, `${title}.png`);
      showToast("PNG 已导出");
    } catch (err) {
      console.error("PNG export failed:", err);
      showToast("PNG 导出失败");
    }
  }, [title, showToast]);

  /* -- export JSON -- */
  const handleExportJson = useCallback(() => {
    try {
      exportToJSON({ theme, mode, title, author, cells, customEntries });
      showToast("JSON 已导出");
    } catch (err) {
      console.error("JSON export failed:", err);
      showToast("JSON 导出失败");
    }
  }, [theme, title, author, cells, customEntries, showToast]);

  /* -- import JSON (trigger hidden file input) -- */
  const handleImportJson = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = (await importFromJSON(file)) as {
          theme?: ThemeName;
          mode?: DisplayMode;
          title?: string;
          author?: string;
          cells?: Record<string, PreferenceCellData>;
          customEntries?: Entry[];
        };
        if (data.theme) setTheme(data.theme);
        if (data.mode === "light" || data.mode === "dark") setMode(data.mode);
        if (data.title) setTitle(data.title);
        if (data.author !== undefined) setAuthor(data.author);
        if (data.cells) setCells(mergeCells(buildDefaultCells(), data.cells));
        if (data.customEntries) setCustomEntries(data.customEntries);
        showToast("JSON 已导入");
      } catch (err) {
        console.error("JSON import failed:", err);
        showToast("JSON 导入失败");
      }
      // allow re-importing the same file
      e.target.value = "";
    },
    [showToast],
  );

  /* -- copy share text -- */
  const handleCopyShareText = useCallback(async () => {
    try {
      const text = generateShareText(title, author, cells);
      await navigator.clipboard.writeText(text);
      showToast("已复制到剪贴板");
    } catch (err) {
      console.error("Copy share text failed:", err);
      showToast("复制失败");
    }
  }, [title, author, cells, showToast]);

  /* -- clear all -- */
  const handleClear = useCallback(() => {
    if (!window.confirm("确定要清空所有内容吗？此操作不可撤销。")) return;
    clearAll();
    setCells(buildDefaultCells());
    setCustomEntries([]);
    setTitle("术曲个人喜好表");
    setAuthor("");
    showToast("已清空");
  }, [showToast]);

  /* ============ editing cell data ============ */
  const editingCell = editingCellId ? cells[editingCellId] : undefined;

  /* ============ render ============ */
  return (
    <div
      data-theme={theme}
      data-mode={mode}
      className="min-h-screen transition-colors"
      style={{ background: "var(--page-bg)", color: "var(--page-text)" }}
    >
      {/* hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-[9999] rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* toolbar */}
      <Toolbar
        title={title}
        onTitleChange={setTitle}
        author={author}
        onAuthorChange={setAuthor}
        theme={theme}
        onThemeChange={setTheme}
        mode={mode}
        onModeChange={setMode}
        proxy={proxy}
        onProxyChange={setProxy}
        onSave={handleSave}
        onExportPNG={handleExportPng}
        onExportJSON={handleExportJson}
        onImportJSON={handleImportJson}
        onCopyShareText={handleCopyShareText}
        onClear={handleClear}
      />

      {/* main grid */}
      <main className="mx-auto max-w-[1200px] px-4 py-6">
        <PreferenceGrid
          ref={gridRef}
          cells={cells}
          onCellClick={handleCellClick}
        />
      </main>

      {/* editor modal */}
      {editingCellId && editingCell && (
        <EntryEditorModal
          cellData={editingCell}
          allEntries={allEntries}
          onClose={handleEditorClose}
          onSave={handleSaveToCell}
          onSaveAsCustom={handleSaveAsCustom}
        />
      )}

      {/* Hidden export-optimized grid (captured by html-to-image) */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <ExportGrid
          ref={exportGridRef}
          title={title}
          author={author}
          cells={cells}
        />
      </div>
    </div>
  );
}

export default App;
