import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Form, useFetcher, useLoaderData, useNavigation, useSearchParams } from "react-router";
import type { repositoriesLoader } from "./repositories.server";
import "./repositories.css";

export { repositoriesAction as action, repositoriesLoader as loader } from "./repositories.server";

// --- Type Definitions ---

type Repository = {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  isPrivate: boolean;
  isEnabled: boolean;
  lastSyncAt: Date | null;
};

type ActivityStatus = "all" | "active" | "stale" | "inactive";

type SuccessData = {
  repositories: Repository[];
  totalCount: number;
  nextCursor: string | undefined;
  filters: {
    search: string | undefined;
    activity: ActivityStatus;
  };
};

type ErrorData = { error: string };

type LoaderData = SuccessData | ErrorData;

type FetcherData = { error: string } | { repositoryIds: string[]; count: number } | { repositories: Repository[]; nextCursor?: string } | null;

// --- Custom Hook ---

function useRepositorySelection(initialData: SuccessData) {
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchValue, setSearchValue] = useState(initialData.filters.search || "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allMatchingSelected, setAllMatchingSelected] = useState(false);
  const [allRepositories, setAllRepositories] = useState<Repository[]>(initialData.repositories);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialData.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    setAllRepositories(initialData.repositories);
    setNextCursor(initialData.nextCursor);
    if (isInitialLoad.current) {
      const enabledIds = new Set(initialData.repositories.filter((r) => r.isEnabled).map((r) => r.id));
      setSelectedIds(enabledIds);
      isInitialLoad.current = false;
    }
  }, [initialData]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    const fetchedData = fetcher.data as FetcherData;
    if (!fetchedData) return;

    if ("error" in fetchedData) {
      setIsLoadingMore(false);
      return;
    }
    if ("repositoryIds" in fetchedData && Array.isArray(fetchedData.repositoryIds)) {
      setSelectedIds(new Set(fetchedData.repositoryIds));
      return;
    }
    if (isLoadingMore && "repositories" in fetchedData) {
      setAllRepositories((prev) => [...prev, ...fetchedData.repositories]);
      setNextCursor(fetchedData.nextCursor);
      const newEnabledIds = fetchedData.repositories.filter((r) => r.isEnabled).map((r) => r.id);
      setSelectedIds((prev) => new Set([...prev, ...newEnabledIds]));
      setIsLoadingMore(false);
    }
  }, [fetcher.data, fetcher.state, isLoadingMore]);

  useEffect(() => {
    const shouldSelectRecommended = searchParams.get("select") === "recommended";
    if (shouldSelectRecommended) {
      const formData = new FormData();
      formData.append("intent", "select-all-matching");
      formData.append("activity", "active");
      formData.append("isEnabled", "true");
      setAllMatchingSelected(true);
      fetcher.submit(formData, { method: "post" });
      searchParams.delete("select");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, fetcher, setSearchParams]);

  const loadMore = useCallback(() => {
    if (!nextCursor || isLoadingMore || fetcher.state !== "idle") return;
    const params = new URLSearchParams(searchParams);
    params.set("cursor", nextCursor);
    setIsLoadingMore(true);
    fetcher.load(`/onboarding/repositories?${params.toString()}`);
  }, [nextCursor, searchParams, isLoadingMore, fetcher]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      const timer = setTimeout(() => {
        const params = new URLSearchParams(searchParams);
        if (value) params.set("search", value);
        else params.delete("search");
        setSearchParams(params);
      }, 300);
      return () => clearTimeout(timer);
    },
    [searchParams, setSearchParams]
  );

  const handleActivityChange = (activity: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("activity", activity);
    setSearchParams(params);
  };

  const handleToggle = (repositoryId: string, isEnabled: boolean) => {
    const formData = new FormData();
    formData.append("intent", "toggle");
    formData.append("repositoryId", repositoryId);
    formData.append("isEnabled", String(isEnabled));
    fetcher.submit(formData, { method: "post" });
    setAllMatchingSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isEnabled) next.add(repositoryId);
      else next.delete(repositoryId);
      return next;
    });
  };

  const createSelectAllHandler = (select: boolean) => () => {
    const formData = new FormData();
    formData.append("intent", "select-all-matching");
    if (initialData.filters.search) formData.append("search", initialData.filters.search);
    formData.append("activity", initialData.filters.activity);
    formData.append("isEnabled", String(select));
    if (select) setAllMatchingSelected(true);
    else {
      setAllMatchingSelected(false);
      setSelectedIds(new Set());
    }
    fetcher.submit(formData, { method: "post" });
  };

  const handleSelectRecommended = () => {
    const params = new URLSearchParams();
    params.set("activity", "active");
    params.set("select", "recommended");
    setSearchParams(params);
  };

  const selectedCount = allMatchingSelected ? initialData.totalCount : selectedIds.size;

  return {
    allRepositories,
    nextCursor,
    isLoadingMore,
    loadMore,
    searchValue,
    selectedIds,
    selectedCount,
    handleSearchChange,
    handleActivityChange,
    handleToggle,
    handleSelectAll: createSelectAllHandler(true),
    handleDeselectAll: createSelectAllHandler(false),
    handleSelectRecommended,
  };
}

// --- Components ---

function ErrorView({ error }: ErrorData) {
  return (
    <div className="onboarding-container">
      <div className="error-state">
        <h2>Error</h2>
        <p>{error}</p>
        <a href="/onboarding/datasources">Back to Data Sources</a>
      </div>
    </div>
  );
}

export default function Repositories() {
  const data = useLoaderData() as LoaderData;
  return "error" in data ? <ErrorView error={data.error} /> : <RepositoriesView data={data} />;
}

function RepositoriesView({ data }: { data: SuccessData }) {
  const navigation = useNavigation();
  const parentRef = useRef<HTMLDivElement>(null);
  const {
    allRepositories,
    nextCursor,
    isLoadingMore,
    loadMore,
    searchValue,
    selectedIds,
    selectedCount,
    handleSearchChange,
    handleActivityChange,
    handleToggle,
    handleSelectAll,
    handleDeselectAll,
    handleSelectRecommended,
  } = useRepositorySelection(data);
  const isLoading = navigation.state !== "idle";

  const virtualizer = useVirtualizer({
    count: allRepositories.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 10,
  });

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      if (distanceFromBottom < 200 && nextCursor && !isLoadingMore) {
        loadMore();
      }
    };
    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [nextCursor, isLoadingMore, loadMore]);

  return (
    <div className="onboarding-container">
      <div className="page-header">
        <h1>Select Repositories</h1>
        <p>Choose which repositories you want to monitor. Active repositories are pre-selected.</p>
      </div>

      <div className="repository-filters">
        <div className="search-box">
          <input type="text" placeholder="Search repositories..." value={searchValue} onChange={(e) => handleSearchChange(e.target.value)} className="search-input" />
        </div>
        <div className="filter-group">
          <span className="filter-label">Activity:</span>
          <select value={data.filters.activity} onChange={(e) => handleActivityChange(e.target.value)} className="filter-select">
            <option value="all">All</option>
            <option value="active">Active (&lt; 30 days)</option>
            <option value="stale">Stale (30-90 days)</option>
            <option value="inactive">Inactive (&gt; 90 days)</option>
          </select>
        </div>
      </div>

      <div className="bulk-actions">
        <div className="selection-count">
          <strong>{selectedCount}</strong> of <strong>{data.totalCount}</strong> repositories selected
        </div>
        <div className="action-buttons">
          <button type="button" onClick={handleSelectAll} className="btn-secondary">
            Select All
          </button>
          <button type="button" onClick={handleDeselectAll} className="btn-secondary">
            Deselect All
          </button>
          <button type="button" onClick={handleSelectRecommended} className="btn-secondary">
            Select Active
          </button>
        </div>
      </div>

      <div ref={parentRef} className="repository-list-container">
        <div className="repository-list-sizer" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const repo = allRepositories[virtualRow.index];
            return repo ? (
              <RepositoryRow key={repo.id} repo={repo} isSelected={selectedIds.has(repo.id)} onToggle={handleToggle} measureRef={virtualizer.measureElement} style={{ transform: `translateY(${virtualRow.start}px)` }} />
            ) : null;
          })}
        </div>
      </div>

      <div className="onboarding-actions">
        <a href="/onboarding/datasources" className="btn-secondary">
          Back
        </a>
        <Form method="post">
          <input type="hidden" name="intent" value="continue" />
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? "Processing..." : "Continue"}
          </button>
        </Form>
      </div>
    </div>
  );
}

const RepositoryRow = ({ repo, isSelected, onToggle, measureRef, style }: { repo: Repository; isSelected: boolean; onToggle: (id: string, selected: boolean) => void; measureRef: (el: HTMLDivElement | null) => void; style: React.CSSProperties }) => {
  const lastActive = repo.lastSyncAt ? new Date(repo.lastSyncAt) : null;
  const daysAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const activity = useMemo(() => {
    if (daysAgo === null) return { className: "", label: "" };
    if (daysAgo < 30) return { className: "active", label: "Active" };
    if (daysAgo < 90) return { className: "stale", label: "Stale" };
    return { className: "inactive", label: "Inactive" };
  }, [daysAgo]);

  return (
    <div ref={measureRef} style={style} className="repository-row">
      <label className="repository-item">
        <input type="checkbox" checked={isSelected} onChange={(e) => onToggle(repo.id, e.target.checked)} />
        <div className="repository-info">
          <div className="repository-details">
            <div className="repository-name">{repo.name}</div>
            {repo.description && <div className="repository-description">{repo.description}</div>}
          </div>
          <div className="repository-meta">
            {repo.language && <span className="language">{repo.language}</span>}
            {activity.label && <span className={`activity-badge ${activity.className}`}>{activity.label}</span>}
            {repo.isPrivate && <span className="private-badge">Private</span>}
            {daysAgo !== null && <span className="last-active">Updated {daysAgo}d ago</span>}
            {repo.stars > 0 && <span className="stars">★ {repo.stars}</span>}
          </div>
        </div>
      </label>
    </div>
  );
};