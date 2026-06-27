import React from "react";
import { X, Plus } from "lucide-react";

interface AliasEditorProps {
  aliases: string[];
  onChange: (aliases: string[]) => void;
}

const AliasEditor: React.FC<AliasEditorProps> = ({ aliases, onChange }) => {
  const [inputValue, setInputValue] = React.useState("");

  const addAlias = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (aliases.includes(trimmed)) return;
    onChange([...aliases, trimmed]);
    setInputValue("");
  };

  const removeAlias = (index: number) => {
    onChange(aliases.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addAlias(inputValue.replace(",", ""));
    }
    if (e.key === "Backspace" && inputValue === "" && aliases.length > 0) {
      removeAlias(aliases.length - 1);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addAlias(inputValue);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white p-2 dark:border-gray-600 dark:bg-gray-800">
      {aliases.map((alias, i) => (
        <span
          key={`${alias}-${i}`}
          className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        >
          {alias}
          <button
            type="button"
            onClick={() => removeAlias(i)}
            className="ml-0.5 rounded-sm hover:bg-blue-200 dark:hover:bg-blue-800"
            aria-label={`Remove alias ${alias}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={aliases.length === 0 ? "输入别名，按回车或逗号添加" : "继续添加..."}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
        {inputValue.trim() && (
          <button
            type="button"
            onClick={() => addAlias(inputValue)}
            className="rounded p-0.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Add alias"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AliasEditor;
