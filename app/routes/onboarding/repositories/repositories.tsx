import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import { Form, useFetcher, useLoaderData, useNavigation, useSearchParams } from "react-router";
import type { repositoriesLoader } from "./repositories.server";
import "./repositories.css";

export { repositoriesAction as action, repositoriesLoader as loader } from "./repositories.server";

export default function Repositories() {
  const data = useLoaderData<typeof repositoriesLoader>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchValue, setSearchValue] = useState(("error" in data ? "" : data.filters.search) || "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allMatchingSelected, setAllMatchingSelected] = useState(false);
  const [allRepositories, setAllRepositories] = useState<
    Array<{
      id: string;
      name: string;
      fullName: string;
      description: string | null;
      language: string | null;
      stars: number;
      isPrivate: boolean;
      isEnabled: boolean;
      lastSyncAt: Date | null;
    }>
  >("error" in data ? [] : data.repositories);
  const [nextCursor, setNextCursor] = useState<string | undefined>("error" in data ? undefined : data.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const isLoading = navigation.state !== "idle";

  const virtualizer = useVirtualizer({
    count: "error" in data ? 0 : allRepositories.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 10,
    measureElement: typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1 ? (element) => element.getBoundingClientRect().height : undefined,
  });

  // Track if this is the initial load
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if ("error" in data) return;
    console.log("Data loaded:", { repositoryCount: data.repositories.length, totalCount: data.totalCount, nextCursor: data.nextCursor });
    setAllRepositories(data.repositories);
    setNextCursor(data.nextCursor);

    // Only set initial selected IDs on first load, don't reset on subsequent data changes
    if (isInitialLoad.current) {
      const enabledIds = new Set(data.repositories.filter((r) => r.isEnabled).map((r) => r.id));
      setSelectedIds(enabledIds);
      isInitialLoad.current = false;
    }

    // Don't reset allMatchingSelected here - it's managed by user actions
  }, [data]);

  const loadMore = useCallback(() => {
    if (!nextCursor || isLoadingMore || fetcher.state !== "idle") return;

    const params = new URLSearchParams(searchParams);
    params.set("cursor", nextCursor);

    console.log("Fetching more repositories with cursor:", nextCursor);
    setIsLoadingMore(true);
    fetcher.load(`/onboarding/repositories?${params.toString()}`);
  }, [nextCursor, searchParams, isLoadingMore, fetcher]);

  useEffect(() => {
    console.log("Fetcher state changed:", { state: fetcher.state, hasData: !!fetcher.data, dataKeys: fetcher.data ? Object.keys(fetcher.data) : [] });

    if (!fetcher.data || fetcher.state !== "idle") return;

    const fetchedData = fetcher.data;
    if ("error" in fetchedData) {
      console.error("Error from fetcher:", fetchedData.error);
      setIsLoadingMore(false);
      return;
    }

    // Handle select-all-matching response (from action)
    if ("repositoryIds" in fetchedData) {
      console.log("Select all response received!", {
        hasRepositoryIds: "repositoryIds" in fetchedData,
        isArray: Array.isArray(fetchedData.repositoryIds),
        count: fetchedData.count,
        idCount: Array.isArray(fetchedData.repositoryIds) ? fetchedData.repositoryIds.length : 0,
        firstFewIds: Array.isArray(fetchedData.repositoryIds) ? fetchedData.repositoryIds.slice(0, 3) : [],
      });
      if (Array.isArray(fetchedData.repositoryIds)) {
        const newSet = new Set(fetchedData.repositoryIds);
        console.log("Setting selectedIds to Set with", newSet.size, "IDs");
        setSelectedIds(newSet);
        console.log("Updated selectedIds state");
      } else {
        console.error("repositoryIds is not an array:", fetchedData.repositoryIds);
      }
      return;
    }

    // Handle load more response (from loader)
    if (isLoadingMore && "repositories" in fetchedData) {
      console.log("Fetcher data received:", { count: fetchedData.repositories.length, nextCursor: fetchedData.nextCursor });

      setAllRepositories((prev) => [...prev, ...fetchedData.repositories]);
      setNextCursor(fetchedData.nextCursor);

      // Update selected IDs to include newly loaded enabled repos
      const newEnabledIds = fetchedData.repositories.filter((r) => r.isEnabled).map((r) => r.id);
      setSelectedIds((prev) => new Set([...prev, ...newEnabledIds]));

      setIsLoadingMore(false);
    }
  }, [fetcher.data, fetcher.state, isLoadingMore]);

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      console.log("Scroll detected:", { scrollTop, scrollHeight, clientHeight, distanceFromBottom, hasNextCursor: !!nextCursor, isLoadingMore });

      if (distanceFromBottom < 200 && nextCursor && !isLoadingMore) {
        console.log("Loading more repositories...");
        loadMore();
      }
    };

    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [nextCursor, isLoadingMore, loadMore]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);

      const timer = setTimeout(() => {
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set("search", value);
        } else {
          params.delete("search");
        }
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
    console.log("handleToggle called:", { repositoryId, isEnabled, currentSelectedCount: selectedIds.size, allMatchingSelected });

    const formData = new FormData();
    formData.append("intent", "toggle");
    formData.append("repositoryId", repositoryId);
    formData.append("isEnabled", String(isEnabled));

    // Use fetcher to avoid page reload
    fetcher.submit(formData, { method: "post" });

    // Individual toggle clears the "all selected" mode
    setAllMatchingSelected(false);

    setSelectedIds((prev) => {
      console.log("setSelectedIds updater called, prev size:", prev.size);
      const next = new Set(prev);
      if (isEnabled) {
        next.add(repositoryId);
      } else {
        next.delete(repositoryId);
      }
      console.log("setSelectedIds updater returning, next size:", next.size);
      return next;
    });
  };

  const handleSelectAll = async () => {
    if ("error" in data) return;

    const formData = new FormData();
    formData.append("intent", "select-all-matching");
    if (data.filters.search) formData.append("search", data.filters.search);
    formData.append("activity", data.filters.activity);
    formData.append("isEnabled", "true");

    // Mark all matching as selected (will be updated with actual IDs from server)
    setAllMatchingSelected(true);

    // Use fetcher to avoid page reload - response will contain all repository IDs
    fetcher.submit(formData, { method: "post" });
  };

  const handleDeselectAll = async () => {
    if ("error" in data) return;

    const formData = new FormData();
    formData.append("intent", "select-all-matching");
    if (data.filters.search) formData.append("search", data.filters.search);
    formData.append("activity", data.filters.activity);
    formData.append("isEnabled", "false");

    // Clear all matching selected flag
    setAllMatchingSelected(false);
    setSelectedIds(new Set());

    // Use fetcher to avoid page reload
    fetcher.submit(formData, { method: "post" });
  };

  const handleSelectRecommended = () => {
    const params = new URLSearchParams();
    params.set("activity", "active");
    setSearchParams(params);

    setTimeout(() => {
      const formData = new FormData();
      formData.append("intent", "select-all-matching");
      formData.append("activity", "active");
      formData.append("isEnabled", "true");

      // Mark all matching as selected
      setAllMatchingSelected(true);

      // Use fetcher to avoid page reload
      fetcher.submit(formData, { method: "post" });
    }, 100);
  };

  if ("error" in data) {
    return (
      <div className="onboarding-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{data.error}</p>
          <a href="/onboarding/datasources">Back to Data Sources</a>
        </div>
      </div>
    );
  }

  const selectedCount = allMatchingSelected && !("error" in data) ? data.totalCount : selectedIds.size;

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

      <div ref={parentRef} className="repository-list-container" style={{ height: "500px", overflow: "auto" }}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const repo = allRepositories[virtualRow.index];
            if (!repo) return null;

            const isSelected = selectedIds.has(repo.id);
            const lastActive = repo.lastSyncAt ? new Date(repo.lastSyncAt) : null;
            const daysAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)) : null;

            let activityBadge = "";
            if (daysAgo !== null) {
              if (daysAgo < 30) activityBadge = "active";
              else if (daysAgo < 90) activityBadge = "stale";
              else activityBadge = "inactive";
            }

            return (
              <div
                key={repo.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="repository-row"
              >
                <label className="repository-item">
                  <input type="checkbox" checked={isSelected} onChange={(e) => handleToggle(repo.id, e.target.checked)} />
                  <div className="repository-info">
                    <div className="repository-details">
                      <div className="repository-name">{repo.name}</div>
                      {repo.description && <div className="repository-description">{repo.description}</div>}
                    </div>
                    <div className="repository-meta">
                      {repo.language && <span className="language">{repo.language}</span>}
                      {activityBadge && <span className={`activity-badge ${activityBadge}`}>{activityBadge}</span>}
                      {repo.isPrivate && <span className="private-badge">Private</span>}
                      {daysAgo !== null && <span className="last-active">Updated {daysAgo}d ago</span>}
                      {repo.stars > 0 && <span className="stars">★ {repo.stars}</span>}
                    </div>
                  </div>
                </label>
              </div>
            );
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
