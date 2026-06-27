import React from "react";
import { Palette, Sun, Moon } from "lucide-react";

export type ThemeName = "miku" | "tianyi" | "kagamine" | "luka" | "kaito" | "meiko";
export type DisplayMode = "dark" | "light";

interface ThemeSwitcherProps {
  currentTheme: ThemeName;
  mode: DisplayMode;
  onChange: (theme: ThemeName) => void;
  onModeChange: (mode: DisplayMode) => void;
}

const THEME_OPTIONS: { value: ThemeName; label: string; color: string }[] = [
  { value: "miku", label: "初音ミク", color: "#39c5bb" },
  { value: "tianyi", label: "洛天依", color: "#66ccff" },
  { value: "kagamine", label: "鏡音リン・レン", color: "#c9a638" },
  { value: "luka", label: "巡音ルカ", color: "#ff6b9d" },
  { value: "kaito", label: "KAITO", color: "#4169e1" },
  { value: "meiko", label: "MEIKO", color: "#e63946" },
];

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  mode,
  onChange,
  onModeChange,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Character themes */}
      <div className="flex items-center gap-2">
        <Palette size={16} className="shrink-0" style={{ color: "var(--accent)" }} />
        <div className="flex flex-wrap gap-1.5">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                borderColor: opt.color,
                background: currentTheme === opt.value ? opt.color : "transparent",
                color: currentTheme === opt.value ? "#fff" : opt.color,
              }}
              title={opt.label}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: opt.color }}
              />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Light / Dark toggle */}
      <button
        type="button"
        onClick={() => onModeChange(mode === "dark" ? "light" : "dark")}
        className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
        style={{
          borderColor: "var(--accent)",
          background: "var(--accent)",
          color: "var(--accent-text)",
        }}
        title={mode === "dark" ? "切换日间模式" : "切换夜间模式"}
      >
        {mode === "dark" ? <Sun size={13} /> : <Moon size={13} />}
        {mode === "dark" ? "日间" : "夜间"}
      </button>
    </div>
  );
};

export default ThemeSwitcher;
