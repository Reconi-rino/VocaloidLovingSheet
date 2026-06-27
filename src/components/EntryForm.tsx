import React from "react";
import type { Entry, EntryType, SourceLink } from "../types";
import AliasEditor from "./AliasEditor";
import ImagePicker from "./ImagePicker";
import { Plus, X, Link } from "lucide-react";

interface EntryFormProps {
  entry: Partial<Entry>;
  onChange: (entry: Partial<Entry>) => void;
}

const EntryForm: React.FC<EntryFormProps> = ({ entry, onChange }) => {
  if (!entry) return null;

  const update = (patch: Partial<Entry>) => {
    onChange({
      ...entry,
      ...patch,
      aliases: patch.aliases ?? (Array.isArray(entry.aliases) ? entry.aliases : []),
      producers: patch.producers ?? (Array.isArray(entry.producers) ? entry.producers : []),
      singers: patch.singers ?? (Array.isArray(entry.singers) ? entry.singers : []),
      sourceLinks: patch.sourceLinks ?? (Array.isArray(entry.sourceLinks) ? entry.sourceLinks : []),
      tags: patch.tags ?? (Array.isArray(entry.tags) ? entry.tags : []),
    });
  };

  const addSourceLink = () => {
    const links = [...(entry.sourceLinks || [])];
    links.push({ label: "", url: "" });
    update({ sourceLinks: links });
  };

  const updateSourceLink = (index: number, patch: Partial<SourceLink>) => {
    const links = [...(entry.sourceLinks || [])];
    links[index] = { ...links[index], ...patch };
    update({ sourceLinks: links });
  };

  const removeSourceLink = (index: number) => {
    const links = [...(entry.sourceLinks || [])];
    links.splice(index, 1);
    update({ sourceLinks: links });
  };

  const addTag = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const tags = [...(entry.tags || [])];
    if (tags.includes(trimmed)) return;
    tags.push(trimmed);
    update({ tags });
  };

  const removeTag = (index: number) => {
    const tags = [...(entry.tags || [])];
    tags.splice(index, 1);
    update({ tags });
  };

  const [tagInput, setTagInput] = React.useState("");

  const fieldClass =
    "w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800";
  const labelClass = "mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400";

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div>
        <label className={labelClass}>类型</label>
        <select
          value={entry.type || "song"}
          onChange={(e) => update({ type: e.target.value as EntryType })}
          className={fieldClass}
        >
          <option value="song">歌曲</option>
          <option value="producer">P主</option>
          <option value="singer">歌姬</option>
          <option value="album">专辑</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      {/* Title fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>标题 *</label>
          <input
            type="text"
            value={entry.title || ""}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="主标题"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>原文名</label>
          <input
            type="text"
            value={entry.originalTitle || ""}
            onChange={(e) => update({ originalTitle: e.target.value })}
            placeholder="原始语言标题"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>中文名</label>
          <input
            type="text"
            value={entry.chineseTitle || ""}
            onChange={(e) => update({ chineseTitle: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>日文名</label>
          <input
            type="text"
            value={entry.japaneseTitle || ""}
            onChange={(e) => update({ japaneseTitle: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>英文名</label>
          <input
            type="text"
            value={entry.englishTitle || ""}
            onChange={(e) => update({ englishTitle: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>显示名</label>
          <input
            type="text"
            value={entry.displayTitle || ""}
            onChange={(e) => update({ displayTitle: e.target.value })}
            placeholder="格子中显示的名称"
            className={fieldClass}
          />
        </div>
      </div>

      {/* Aliases */}
      <div>
        <label className={labelClass}>别名</label>
        <AliasEditor
          aliases={entry.aliases || []}
          onChange={(aliases) => update({ aliases })}
        />
      </div>

      {/* Producers / Singers / Album / Year */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>P主</label>
          <input
            type="text"
            value={(entry.producers || []).join(", ")}
            onChange={(e) =>
              update({
                producers: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="逗号分隔多个"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>歌姬</label>
          <input
            type="text"
            value={(entry.singers || []).join(", ")}
            onChange={(e) =>
              update({
                singers: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="逗号分隔多个"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>专辑</label>
          <input
            type="text"
            value={entry.album || ""}
            onChange={(e) => update({ album: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>年份</label>
          <input
            type="text"
            value={entry.year ?? ""}
            onChange={(e) => update({ year: e.target.value || undefined })}
            placeholder="如 2024"
            className={fieldClass}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>备注</label>
        <textarea
          value={entry.description || ""}
          onChange={(e) => update({ description: e.target.value })}
          rows={2}
          placeholder="个人备注..."
          className={`${fieldClass} resize-none`}
        />
      </div>

      {/* Source links */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass + " !mb-0"}>平台链接</label>
          <button
            type="button"
            onClick={addSourceLink}
            className="inline-flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700"
          >
            <Plus size={12} /> 添加
          </button>
        </div>
        <div className="space-y-2">
          {(entry.sourceLinks || []).map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) =>
                  updateSourceLink(i, { label: e.target.value })
                }
                placeholder="标签 (如 B站)"
                className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <div className="relative flex-1">
                <Link
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) =>
                    updateSourceLink(i, { url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full rounded-md border border-gray-300 bg-white py-1 pl-6 pr-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSourceLink(i)}
                className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>标签</label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white p-2 dark:border-gray-600 dark:bg-gray-800">
          {(entry.tags || []).map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="rounded-sm hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput.replace(",", ""));
                setTagInput("");
              }
            }}
            onBlur={() => {
              if (tagInput.trim()) {
                addTag(tagInput);
                setTagInput("");
              }
            }}
            placeholder="添加标签..."
            className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Images */}
      <div className="space-y-3">
        <label className={labelClass}>封面图</label>
        <ImagePicker
          url={entry.coverUrl || ""}
          title={entry.title}
          type="cover"
          onUrlChange={(url) => update({ coverUrl: url || undefined })}
          onRemove={() => update({ coverUrl: undefined })}
        />

        <label className={labelClass}>头像</label>
        <ImagePicker
          url={entry.avatarUrl || ""}
          title={entry.title}
          type="avatar"
          onUrlChange={(url) => update({ avatarUrl: url || undefined })}
          onRemove={() => update({ avatarUrl: undefined })}
        />

        <label className={labelClass}>立绘</label>
        <ImagePicker
          url={entry.portraitUrl || ""}
          title={entry.title}
          type="portrait"
          onUrlChange={(url) => update({ portraitUrl: url || undefined })}
          onRemove={() => update({ portraitUrl: undefined })}
        />
      </div>
    </div>
  );
};

export default EntryForm;
