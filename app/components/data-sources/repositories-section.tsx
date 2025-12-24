import { useCallback, useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { SelectableList } from "~/components/selectable-list/selectable-list";

export function RepositoriesSection({ provider, isExpanded, onToggle }: RepositoriesSectionProps) {
  const fetcher = useFetcher();
  const [searchValue, setSearchValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allRepositories, setAllRepositories] = useState<Repository[]>([]);
  const [_nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (isExpanded && !hasInitialized) {
      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", provider);
      fetcher.submit(formData, { method: "post" });
      setHasInitialized(true);
    }
  }, [isExpanded, hasInitialized, provider, fetcher]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as RepositoriesFetcherData;
      if ("repositories" in data) {
        setAllRepositories(data.repositories);
        setNextCursor(data.nextCursor);
        const enabledIds = new Set(data.repositories.filter((r) => r.isEnabled).map((r) => r.id));
        setSelectedIds(enabledIds);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleToggle = (repositoryId: string, isEnabled: boolean) => {
    const formData = new FormData();
    formData.append("intent", "toggle-repository");
    formData.append("repositoryId", repositoryId);
    formData.append("isEnabled", String(isEnabled));
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isEnabled) {
        next.add(repositoryId);
      } else {
        next.delete(repositoryId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const visibleIds = filteredRepositories.map((r) => r.id);
    const formData = new FormData();
    formData.append("intent", "toggle-repositories-batch");
    for (const id of visibleIds) {
      formData.append("repositoryIds", id);
    }
    formData.append("isEnabled", "true");
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    const visibleIds = filteredRepositories.map((r) => r.id);
    const formData = new FormData();
    formData.append("intent", "toggle-repositories-batch");
    for (const id of visibleIds) {
      formData.append("repositoryIds", id);
    }
    formData.append("isEnabled", "false");
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        next.delete(id);
      }
      return next;
    });
  };

  const filteredRepositories = useMemo(() => {
    if (!searchValue) return allRepositories;
    const lowerSearch = searchValue.toLowerCase();
    return allRepositories.filter((r) => r.name.toLowerCase().includes(lowerSearch) || r.fullName.toLowerCase().includes(lowerSearch));
  }, [allRepositories, searchValue]);

  const selectedCount = selectedIds.size;
  const isLoading = fetcher.state === "loading" || fetcher.state === "submitting";

  return (
    <div className="repositories-section">
      <button type="button" className="repositories-toggle" onClick={onToggle}>
        <span className={`toggle-icon ${isExpanded ? "expanded" : ""}`}>▶</span>
        <span className="toggle-label">Repositories</span>
        {selectedCount > 0 && <span className="selection-badge">{selectedCount} selected</span>}
      </button>

      {isExpanded && (
        <div className="repositories-content">
          {isLoading && allRepositories.length === 0 ? (
            <div className="repositories-loading">
              <div className="loading-skeleton">Loading repositories...</div>
            </div>
          ) : (
            <>
              <div className="repositories-header">
                <input type="text" placeholder="Search repositories..." value={searchValue} onChange={(e) => handleSearchChange(e.target.value)} className="repository-search" />
                <div className="repository-actions">
                  <button type="button" onClick={handleSelectAll} className="btn-repo-action">
                    Select All
                  </button>
                  <button type="button" onClick={handleDeselectAll} className="btn-repo-action">
                    Deselect All
                  </button>
                </div>
              </div>

              <SelectableList
                items={filteredRepositories}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                emptyMessage="No repositories found"
                renderItem={(repo) => {
                  const lastActive = repo.lastSyncAt ? new Date(repo.lastSyncAt) : null;
                  const daysAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  return (
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
                  );
                }}
              />

              <div className="repositories-footer">
                <span className="selection-count">
                  {selectedCount} of {allRepositories.length} repositories selected
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export interface RepositoriesSectionProps {
  provider: string;
  isExpanded: boolean;
  onToggle: () => void;
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

interface RepositoriesFetcherData {
  repositories: Repository[];
  totalCount: number;
  nextCursor?: string;
}
