import React from "react";
import type { ArtworkCandidate, Entry } from "../types";
import {
  resolveArtwork,
  getArtworkUrl,
  getProviderLabel,
  tryCacheRemoteImage,
  validateImageUrl,
  createPlaceholderArtwork,
} from "../services/artwork";
import { Upload, Search, Link, X, RefreshCw, ImageIcon, Check, AlertTriangle } from "lucide-react";

interface ArtworkPickerProps {
  entry: Entry;
  current?: ArtworkCandidate;
  onSelect: (candidate: ArtworkCandidate) => void;
  onRemove: () => void;
}

const ArtworkPicker: React.FC<ArtworkPickerProps> = ({
  entry,
  current,
  onSelect,
  onRemove,
}) => {
  const [candidates, setCandidates] = React.useState<ArtworkCandidate[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState("");
  const [showCandidates, setShowCandidates] = React.useState(false);
  const [warnings, setWarnings] = React.useState<string[]>([]);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const previewUrl = current ? getArtworkUrl(current) : undefined;

  // Auto-resolve on mount
  React.useEffect(() => {
    if (!current && candidates.length === 0) {
      handleFindArtwork();
    }
  }, []); // eslint-disable-line

  const handleFindArtwork = async () => {
    setLoading(true);
    try {
      const result = await resolveArtwork(entry);
      setCandidates(result.candidates);
      setWarnings(result.warnings);
      if (!current && result.selected) {
        onSelect(result.selected);
      }
    } catch (err) {
      console.warn("Artwork resolve failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const candidate: ArtworkCandidate = {
        id: `upload-${Date.now()}`,
        provider: "upload",
        kind: entry.type === "singer" ? "singer-portrait" : entry.type === "producer" ? "producer-avatar" : entry.type === "album" ? "album-cover" : "song-cover",
        dataUrl,
        title: file.name,
        confidence: 1,
        corsSafe: true,
        exportSafe: true,
        createdAt: new Date().toISOString(),
      };
      onSelect(candidate);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    const validation = await validateImageUrl(urlInput.trim());
    const candidate: ArtworkCandidate = {
      id: `manual-${Date.now()}`,
      provider: "manual-url",
      kind: entry.type === "singer" ? "singer-portrait" : entry.type === "producer" ? "producer-avatar" : entry.type === "album" ? "album-cover" : "song-cover",
      url: urlInput.trim(),
      confidence: 0.8,
      corsSafe: validation.corsSafe,
      exportSafe: validation.corsSafe,
      width: validation.width,
      height: validation.height,
      createdAt: new Date().toISOString(),
    };
    onSelect(candidate);
    setUrlInput("");
  };

  const handleSelectCandidate = async (candidate: ArtworkCandidate) => {
    // Try to cache remote images
    if (candidate.url && !candidate.dataUrl) {
      const cached = await tryCacheRemoteImage(candidate);
      onSelect(cached);
    } else {
      onSelect(candidate);
    }
  };

  const handleUsePlaceholder = () => {
    const placeholder = createPlaceholderArtwork(entry,
      entry.type === "singer" ? "singer-portrait" : entry.type === "producer" ? "producer-avatar" : entry.type === "album" ? "album-cover" : "song-cover"
    );
    onSelect(placeholder);
  };

  return (
    <div className="space-y-3">
      {/* Current preview */}
      <div className="flex items-start gap-3">
        <div
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border"
          style={{ borderColor: "var(--accent)" }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--result-bg)" }}>
              <ImageIcon size={32} style={{ opacity: 0.3 }} />
            </div>
          )}
          {current && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute right-0.5 top-0.5 rounded-full bg-red-500 p-0.5 text-white transition-opacity hover:opacity-80"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex-1 space-y-1.5">
          {/* Source label */}
          {current && (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
                style={{ background: "var(--accent)", color: "var(--accent-text, #fff)" }}
              >
                {getProviderLabel(current.provider)}
              </span>
              {current.exportSafe === false && (
                <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
                  <AlertTriangle size={10} />
                  导出受限
                </span>
              )}
              {current.exportSafe === true && (
                <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                  <Check size={10} />
                  可导出
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleFindArtwork}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
              查找素材
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              <Upload size={12} />
              上传
            </button>
            <button
              type="button"
              onClick={handleUsePlaceholder}
              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              <ImageIcon size={12} />
              占位图
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {/* URL input */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Link size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ opacity: 0.4 }} />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlSubmit(); }}}
            placeholder="粘贴图片 URL..."
            className="w-full rounded border py-1.5 pl-7 pr-2 text-xs"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--page-text)" }}
          />
        </div>
        <button
          type="button"
          onClick={handleUrlSubmit}
          className="rounded px-2 py-1 text-xs transition-opacity hover:opacity-80"
          style={{ background: "var(--btn-bg)", color: "var(--btn-text)" }}
        >
          确定
        </button>
      </div>

      {/* Candidates */}
      {candidates.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCandidates(!showCandidates)}
            className="text-xs"
            style={{ color: "var(--accent)" }}
          >
            {showCandidates ? "收起候选" : `候选图 (${candidates.length})`}
          </button>
          {showCandidates && (
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {candidates.map((c) => {
                const url = getArtworkUrl(c);
                const isSelected = current?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCandidate(c)}
                    className="relative overflow-hidden rounded border-2 transition-all"
                    style={{
                      borderColor: isSelected ? "var(--accent)" : "transparent",
                      opacity: isSelected ? 1 : 0.8,
                    }}
                  >
                    {url ? (
                      <img src={url} alt="" className="h-16 w-full object-cover" />
                    ) : (
                      <div className="flex h-16 w-full items-center justify-center text-[10px]" style={{ background: "var(--result-bg)" }}>
                        无预览
                      </div>
                    )}
                    <div className="truncate px-1 py-0.5 text-[9px]" style={{ background: "var(--cell-label-bg)", color: "var(--cell-label-text)" }}>
                      {getProviderLabel(c.provider)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-0.5">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px] text-yellow-400">
              <AlertTriangle size={10} />
              {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtworkPicker;
