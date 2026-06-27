import React from "react";
import {
  Save,
  Download,
  Upload,
  Image,
  Copy,
  Trash2,
  Globe,
} from "lucide-react";
import ThemeSwitcher from "./ThemeSwitcher";
import type { ThemeName, DisplayMode } from "./ThemeSwitcher";

interface ToolbarProps {
  theme: ThemeName;
  mode: DisplayMode;
  proxy: boolean;
  title: string;
  author: string;
  onThemeChange: (theme: ThemeName) => void;
  onModeChange: (mode: DisplayMode) => void;
  onProxyChange: (enabled: boolean) => void;
  onTitleChange: (title: string) => void;
  onAuthorChange: (author: string) => void;
  onSave: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: () => void;
  onCopyShareText: () => void;
  onClear: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  theme,
  mode,
  proxy,
  title,
  author,
  onThemeChange,
  onModeChange,
  onProxyChange,
  onTitleChange,
  onAuthorChange,
  onSave,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  onCopyShareText,
  onClear,
}) => {
  const btnStyle: React.CSSProperties = {
    background: "var(--btn-bg)",
    color: "var(--btn-text)",
    borderColor: "var(--btn-border)",
  };

  return (
    <header
      className="space-y-3 rounded-lg border p-4"
      style={{
        background: "var(--toolbar-bg)",
        color: "var(--toolbar-text)",
        borderColor: "var(--toolbar-border)",
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="shrink-0 text-xl font-bold" style={{ color: "var(--accent)" }}>
          术曲个人喜好表
        </h1>
        <div className="flex items-center gap-2">
          <ThemeSwitcher
            currentTheme={theme}
            mode={mode}
            onChange={onThemeChange}
            onModeChange={onModeChange}
          />
          <button
            type="button"
            onClick={() => onProxyChange(!proxy)}
            className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              borderColor: proxy ? "var(--accent)" : "var(--input-border)",
              background: proxy ? "var(--accent)" : "transparent",
              color: proxy ? "var(--accent-text)" : "var(--page-text)",
              opacity: proxy ? 1 : 0.6,
            }}
            title={proxy ? "代理模式已开启（通过 allorigins.win 中转请求）" : "开启代理模式（国内用户建议开启，否则搜索可能失败）"}
          >
            <Globe size={13} />
            {proxy ? "代理中" : "代理"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="自定义标题..."
          className="flex-1 rounded-md border px-3 py-1.5 text-sm"
          style={{
            background: "var(--input-bg)",
            borderColor: "var(--input-border)",
            color: "var(--page-text)",
          }}
        />
        <input
          type="text"
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          placeholder="作者 / 昵称..."
          className="flex-1 rounded-md border px-3 py-1.5 text-sm"
          style={{
            background: "var(--input-bg)",
            borderColor: "var(--input-border)",
            color: "var(--page-text)",
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { icon: Save, label: "保存", onClick: onSave },
          { icon: Image, label: "导出PNG", onClick: onExportPNG },
          { icon: Download, label: "导出JSON", onClick: onExportJSON },
          { icon: Upload, label: "导入JSON", onClick: onImportJSON },
          { icon: Copy, label: "复制分享文本", onClick: onCopyShareText },
          { icon: Trash2, label: "清空", onClick: onClear },
        ].map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={btnStyle}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </header>
  );
};

export default Toolbar;
