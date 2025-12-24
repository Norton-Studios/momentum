import { useCallback, useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { SelectableList } from "~/components/selectable-list/selectable-list";

export function ProjectsSection({ provider, isExpanded, onToggle }: ProjectsSectionProps) {
  const fetcher = useFetcher();
  const [searchValue, setSearchValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (isExpanded && !hasInitialized) {
      const formData = new FormData();
      formData.append("intent", "fetch-projects");
      formData.append("provider", provider);
      fetcher.submit(formData, { method: "post" });
      setHasInitialized(true);
    }
  }, [isExpanded, hasInitialized, provider, fetcher]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const data = fetcher.data as ProjectsFetcherData;
      if ("projects" in data) {
        setAllProjects(data.projects);
        const enabledIds = new Set(data.projects.filter((p) => p.isEnabled).map((p) => p.id));
        setSelectedIds(enabledIds);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleToggle = (projectId: string, isEnabled: boolean) => {
    const formData = new FormData();
    formData.append("intent", "toggle-project");
    formData.append("projectId", projectId);
    formData.append("isEnabled", String(isEnabled));
    fetcher.submit(formData, { method: "post" });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isEnabled) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const visibleIds = filteredProjects.map((p) => p.id);
    const formData = new FormData();
    formData.append("intent", "toggle-projects-batch");
    for (const id of visibleIds) {
      formData.append("projectIds", id);
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
    const visibleIds = filteredProjects.map((p) => p.id);
    const formData = new FormData();
    formData.append("intent", "toggle-projects-batch");
    for (const id of visibleIds) {
      formData.append("projectIds", id);
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

  const filteredProjects = useMemo(() => {
    if (!searchValue) return allProjects;
    const lowerSearch = searchValue.toLowerCase();
    return allProjects.filter((p) => p.name.toLowerCase().includes(lowerSearch) || p.key.toLowerCase().includes(lowerSearch));
  }, [allProjects, searchValue]);

  const selectedCount = selectedIds.size;
  const isLoading = fetcher.state === "loading" || fetcher.state === "submitting";

  return (
    <div className="repositories-section">
      <button type="button" className="repositories-toggle" onClick={onToggle}>
        <span className={`toggle-icon ${isExpanded ? "expanded" : ""}`}>▶</span>
        <span className="toggle-label">Projects</span>
        {selectedCount > 0 && <span className="selection-badge">{selectedCount} selected</span>}
      </button>

      {isExpanded && (
        <div className="repositories-content">
          {isLoading && allProjects.length === 0 ? (
            <div className="repositories-loading">
              <div className="loading-skeleton">Loading projects...</div>
            </div>
          ) : (
            <>
              <div className="repositories-header">
                <input type="text" placeholder="Search projects..." value={searchValue} onChange={(e) => handleSearchChange(e.target.value)} className="repository-search" />
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
                items={filteredProjects}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                emptyMessage="No projects found"
                renderItem={(project) => (
                  <div className="project-info">
                    <span className="project-name">{project.name}</span>
                    <span className="project-key">{project.key}</span>
                  </div>
                )}
              />

              <div className="repositories-footer">
                <span className="selection-count">
                  {selectedCount} of {allProjects.length} projects selected
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export interface ProjectsSectionProps {
  provider: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  isEnabled: boolean;
}

interface ProjectsFetcherData {
  projects: Project[];
}
