import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import "./selectable-list.css";

export function SelectableList<T extends SelectableItem>({ items, selectedIds, onToggle, renderItem, emptyMessage = "No items found", itemHeight = 60 }: SelectableListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  if (items.length === 0) {
    return <div className="selectable-list-empty">{emptyMessage}</div>;
  }

  return (
    <div ref={parentRef} className="selectable-list">
      <div className="selectable-list-sizer" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;

          return (
            <SelectableRow
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              onToggle={onToggle}
              renderItem={renderItem}
              measureRef={virtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function SelectableRow<T extends SelectableItem>({ item, isSelected, onToggle, renderItem, measureRef, style }: SelectableRowProps<T>) {
  return (
    <div ref={measureRef} data-testid="selectable-item" style={style} className="selectable-row">
      <label className="selectable-item">
        <input type="checkbox" checked={isSelected} onChange={(e) => onToggle(item.id, e.target.checked)} />
        <div className="selectable-item-content">{renderItem(item)}</div>
      </label>
    </div>
  );
}

export interface SelectableItem {
  id: string;
}

export interface SelectableListProps<T extends SelectableItem> {
  items: T[];
  selectedIds: Set<string>;
  onToggle: (id: string, isSelected: boolean) => void;
  renderItem: (item: T) => React.ReactNode;
  emptyMessage?: string;
  itemHeight?: number;
}

interface SelectableRowProps<T extends SelectableItem> {
  item: T;
  isSelected: boolean;
  onToggle: (id: string, selected: boolean) => void;
  renderItem: (item: T) => React.ReactNode;
  measureRef: (el: HTMLDivElement | null) => void;
  style: React.CSSProperties;
}
