import type React from "react";
import { useState, useEffect } from "react";
import type { DiscoveredRepository, RepositoryDiscoveryResult } from "@mmtm/resource-repository";

export interface RepositorySelectorProps {
  onRepositoriesChange: (repositories: DiscoveredRepository[]) => void;
  initialRepositories?: DiscoveredRepository[];
  discoveryResults?: RepositoryDiscoveryResult[];
  isLoading?: boolean;
  error?: string | null;
}

export const RepositorySelector: React.FC<RepositorySelectorProps> = ({
  onRepositoriesChange,
  initialRepositories = [],
  discoveryResults = [],
  isLoading = false,
  error = null,
}) => {
  const [selectedRepositories, setSelectedRepositories] = useState<Set<string>>(new Set(initialRepositories.map((repo) => repo.externalId)));

  useEffect(() => {
    const selected = discoveryResults.flatMap((result) => result.repositories).filter((repo) => selectedRepositories.has(repo.externalId));
    onRepositoriesChange(selected);
  }, [selectedRepositories, discoveryResults, onRepositoriesChange]);

  const handleRepositoryToggle = (repo: DiscoveredRepository) => {
    const newSelected = new Set(selectedRepositories);
    if (newSelected.has(repo.externalId)) {
      newSelected.delete(repo.externalId);
    } else {
      newSelected.add(repo.externalId);
    }
    setSelectedRepositories(newSelected);
  };

  const handleSelectAll = (dataSource: string) => {
    const result = discoveryResults.find((r) => r.dataSource === dataSource);
    if (!result) return;

    const newSelected = new Set(selectedRepositories);
    result.repositories.forEach((repo) => {
      newSelected.add(repo.externalId);
    });
    setSelectedRepositories(newSelected);
  };

  const handleDeselectAll = (dataSource: string) => {
    const result = discoveryResults.find((r) => r.dataSource === dataSource);
    if (!result) return;

    const newSelected = new Set(selectedRepositories);
    result.repositories.forEach((repo) => {
      newSelected.delete(repo.externalId);
    });
    setSelectedRepositories(newSelected);
  };

  if (error) {
    return (
      <div className="repository-selector">
        <div className="error-message">
          <h3>Error discovering repositories</h3>
          <p>{error}</p>
          <p>Please check your data source configuration and try again.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="repository-selector">
        <div className="loading-message">
          <div className="spinner" data-testid="loading-spinner" />
          <p>Discovering repositories from your connected data sources...</p>
        </div>
      </div>
    );
  }

  if (discoveryResults.length === 0) {
    return (
      <div className="repository-selector">
        <div className="empty-state">
          <h3>No repositories found</h3>
          <p>Make sure you have connected at least one data source in the previous step.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="repository-selector">
      <div className="repository-selector-header">
        <h3>Select Repositories to Track</h3>
        <p>Choose which repositories you want to include in your productivity tracking.</p>
      </div>

      {discoveryResults.map((result) => (
        <div key={result.dataSource} className="data-source-section">
          <div className="data-source-header">
            <h4>{result.dataSource.charAt(0).toUpperCase() + result.dataSource.slice(1)}</h4>
            <div className="data-source-actions">
              <button type="button" onClick={() => handleSelectAll(result.dataSource)} className="select-all-button">
                Select All ({result.totalCount})
              </button>
              <button type="button" onClick={() => handleDeselectAll(result.dataSource)} className="deselect-all-button">
                Deselect All
              </button>
            </div>
          </div>

          <div className="repositories-list">
            {result.repositories.map((repo) => (
              <button
                key={repo.externalId}
                className={`repository-item ${selectedRepositories.has(repo.externalId) ? "selected" : ""}`}
                onClick={() => handleRepositoryToggle(repo)}
                type="button"
              >
                <div className="repository-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRepositories.has(repo.externalId)}
                    onChange={() => handleRepositoryToggle(repo)}
                    id={`repo-${repo.externalId}`}
                  />
                </div>
                <div className="repository-info">
                  <div className="repository-name-owner">
                    <span className="repository-name">{repo.name}</span>
                    <span className="repository-owner">by {repo.owner}</span>
                  </div>
                  {repo.description && <p className="repository-description">{repo.description}</p>}
                  <div className="repository-meta">
                    {repo.language && <span className="repository-language">{repo.language}</span>}
                    <span className="repository-stats">
                      ⭐ {repo.stars} • 🍴 {repo.forks}
                    </span>
                    {repo.isPrivate && <span className="repository-private">Private</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="selection-summary">
        <p>
          <strong>{Array.from(selectedRepositories).length} repositories selected</strong>
        </p>
      </div>
    </div>
  );
};
