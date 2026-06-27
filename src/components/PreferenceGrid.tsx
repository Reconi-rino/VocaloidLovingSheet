import React from "react";
import type { PreferenceCellData } from "../types";
import PreferenceCell from "./PreferenceCell";

interface PreferenceGridProps {
  cells: Record<string, PreferenceCellData>;
  onCellClick: (categoryId: string) => void;
  onCellClear?: (categoryId: string) => void;
  onCellCopy?: (categoryId: string) => void;
}

const PreferenceGrid = React.forwardRef<HTMLDivElement, PreferenceGridProps>(
  ({ cells, onCellClick, onCellClear, onCellCopy }, ref) => {
    const cellEntries = Object.values(cells);

    return (
      <div
        ref={ref}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5"
      >
        {cellEntries.map((cell) => (
          <PreferenceCell
            key={cell.categoryId}
            data={cell}
            onClick={() => onCellClick(cell.categoryId)}
            onClear={
              cell.entry && onCellClear
                ? () => onCellClear(cell.categoryId)
                : undefined
            }
            onCopy={
              cell.entry && onCellCopy
                ? () => onCellCopy(cell.categoryId)
                : undefined
            }
          />
        ))}
      </div>
    );
  }
);

PreferenceGrid.displayName = "PreferenceGrid";

export default PreferenceGrid;
