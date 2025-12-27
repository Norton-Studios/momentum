import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import "./contributor-selector.css";

export function ContributorSelector({ contributors, defaultContributorId }: ContributorSelectorProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedContributorId = searchParams.get("contributorId") || defaultContributorId || null;
  const selectedContributor = contributors.find((c) => c.id === selectedContributorId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (contributorId: string | null) => {
      const params = new URLSearchParams(searchParams);
      if (contributorId) {
        params.set("contributorId", contributorId);
      } else {
        params.delete("contributorId");
      }
      navigate(`?${params.toString()}`);
      setIsOpen(false);
      setSearchQuery("");
    },
    [navigate, searchParams]
  );

  const filteredContributors = contributors.filter(
    (c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasContributors = contributors.length > 0;
  const displayLabel = selectedContributor ? selectedContributor.name : "Select contributor";
  const initials = selectedContributor
    ? selectedContributor.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null;

  return (
    <div className="contributor-selector" ref={dropdownRef}>
      <button type="button" className="contributor-selector-trigger" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-haspopup="listbox">
        {selectedContributor && (
          <span className="contributor-selector-avatar">
            {selectedContributor.avatarUrl ? (
              <img src={selectedContributor.avatarUrl} alt="" className="contributor-avatar-img" />
            ) : (
              <span className="contributor-avatar-initials">{initials}</span>
            )}
          </span>
        )}
        <span className="contributor-selector-value">{displayLabel}</span>
        <span className="contributor-selector-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="contributor-selector-dropdown" role="listbox">
          {hasContributors && contributors.length > 5 && (
            <div className="contributor-selector-search">
              <input type="text" placeholder="Search contributors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="contributor-search-input" />
            </div>
          )}
          <div className="contributor-selector-options">
            {hasContributors ? (
              filteredContributors.length > 0 ? (
                filteredContributors.map((contributor) => {
                  const contributorInitials = contributor.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <button
                      key={contributor.id}
                      type="button"
                      className={`contributor-selector-option ${selectedContributorId === contributor.id ? "active" : ""}`}
                      onClick={() => handleSelect(contributor.id)}
                      role="option"
                      aria-selected={selectedContributorId === contributor.id}
                    >
                      <span className="contributor-option-avatar">
                        {contributor.avatarUrl ? (
                          <img src={contributor.avatarUrl} alt="" className="contributor-avatar-img" />
                        ) : (
                          <span className="contributor-avatar-initials">{contributorInitials}</span>
                        )}
                      </span>
                      <span className="contributor-option-info">
                        <span className="contributor-option-name">{contributor.name}</span>
                        {contributor.username && <span className="contributor-option-username">@{contributor.username}</span>}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="contributor-selector-empty">No contributors match "{searchQuery}"</div>
              )
            ) : (
              <div className="contributor-selector-empty">No contributors found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Contributor {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
}

interface ContributorSelectorProps {
  contributors: Contributor[];
  defaultContributorId?: string | null;
}
