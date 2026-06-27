import React from "react";
import { Upload, X, ImageIcon } from "lucide-react";

type ImageFit = "cover" | "contain" | "none";

interface ImagePickerProps {
  url: string;
  fit?: ImageFit;
  title?: string;
  onUrlChange: (url: string) => void;
  onFitChange?: (fit: ImageFit) => void;
  onRemove?: () => void;
  type?: "cover" | "avatar" | "portrait";
}

const FIT_OPTIONS: { value: ImageFit; label: string }[] = [
  { value: "cover", label: "裁剪填充" },
  { value: "contain", label: "完整显示" },
  { value: "none", label: "居中原尺寸" },
];

const ImagePicker: React.FC<ImagePickerProps> = ({
  url,
  fit = "cover",
  title,
  onUrlChange,
  onFitChange,
  onRemove,
  type = "cover",
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previewError, setPreviewError] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        onUrlChange(result);
        setPreviewError(false);
      }
    };
    reader.readAsDataURL(file);
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  const fallbackChar = title ? title.charAt(0) : "?";

  const aspectClass =
    type === "avatar" ? "aspect-square w-20" : "aspect-video w-full";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            onUrlChange(e.target.value);
            setPreviewError(false);
          }}
          placeholder={`输入${
            type === "cover" ? "封面" : type === "avatar" ? "头像" : "立绘"
          }图片URL`}
          className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
          title="上传本地图片"
        >
          <Upload size={14} />
          上传
        </button>
        {url && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-gray-300 p-1 text-red-500 hover:bg-red-50 dark:border-gray-600 dark:hover:bg-red-900/30"
            title="移除图片"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview */}
      <div
        className={`${aspectClass} relative overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800`}
      >
        {url && !previewError ? (
          <img
            src={url}
            alt={title || "预览"}
            className="h-full w-full"
            style={{ objectFit: fit }}
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
            <ImageIcon size={24} />
            <span className="text-lg font-bold">{fallbackChar}</span>
          </div>
        )}
      </div>

      {/* Object-fit selector */}
      {onFitChange && (
        <div className="flex items-center gap-3">
          {FIT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-1 text-sm"
            >
              <input
                type="radio"
                name={`fit-${type}`}
                value={opt.value}
                checked={fit === opt.value}
                onChange={() => onFitChange(opt.value)}
                className="accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImagePicker;
