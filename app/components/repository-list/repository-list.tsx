import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import "./repository-list.css";

export function RepositoryList({ repositories, selectedIds, onToggle }: RepositoryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: repositories.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  if (repositories.length === 0) {
    return <div className="repositories-empty">No repositories found</div>;
  }

  return (
    <div ref={parentRef} className="repository-list">
      <div className="repository-list-sizer" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const repo = repositories[virtualRow.index];
          return repo ? (
            <RepositoryRow
              key={repo.id}
              repo={repo}
              isSelected={selectedIds.has(repo.id)}
              onToggle={onToggle}
              measureRef={virtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            />
          ) : null;
        })}
      </div>
    </div>
  );
}

function RepositoryRow({ repo, isSelected, onToggle, measureRef, style }: RepositoryRowProps) {
  const lastActive = repo.lastSyncAt ? new Date(repo.lastSyncAt) : null;
  const daysAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div ref={measureRef} data-testid="repository-item" style={style} className="repository-row">
      <label className="repository-item">
        <input type="checkbox" checked={isSelected} onChange={(e) => onToggle(repo.id, e.target.checked)} />
        <div className="repository-info">
          <div className="repository-details">
            <div className="repository-name">{repo.name}</div>
          </div>
          <div className="repository-meta">
            {repo.language && <span className="language">{repo.language}</span>}
            {repo.isPrivate && <span className="private-badge">Private</span>}
            {repo.stars > 0 && <span className="stars">★ {repo.stars}</span>}
            {daysAgo !== null && <span className="last-active">Updated {daysAgo}d ago</span>}
          </div>
        </div>
      </label>
    </div>
  );
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  isPrivate: boolean;
  isEnabled: boolean;
  lastSyncAt: Date | null;
}

export interface RepositoryListProps {
  repositories: Repository[];
  selectedIds: Set<string>;
  onToggle: (id: string, isEnabled: boolean) => void;
}

interface RepositoryRowProps {
  repo: Repository;
  isSelected: boolean;
  onToggle: (id: string, selected: boolean) => void;
  measureRef: (el: HTMLDivElement | null) => void;
  style: React.CSSProperties;
}
