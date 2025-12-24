import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import "./team-selector.css";

export function TeamSelector({ teams }: TeamSelectorProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTeamId = searchParams.get("teamId");
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (teamId: string | null) => {
      const params = new URLSearchParams(searchParams);
      if (teamId) {
        params.set("teamId", teamId);
      } else {
        params.delete("teamId");
      }
      navigate(`?${params.toString()}`);
      setIsOpen(false);
    },
    [navigate, searchParams]
  );

  const hasTeams = teams.length > 0;
  const displayLabel = selectedTeam ? selectedTeam.name : "All";

  return (
    <div className="team-selector" ref={dropdownRef}>
      <button type="button" className="team-selector-trigger" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-haspopup="listbox">
        <span className="team-selector-label">Team:</span>
        <span className="team-selector-value">{displayLabel}</span>
        <span className="team-selector-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="team-selector-dropdown" role="listbox">
          <button
            type="button"
            className={`team-selector-option ${!selectedTeamId ? "active" : ""}`}
            onClick={() => handleSelect(null)}
            role="option"
            aria-selected={!selectedTeamId}
          >
            All
          </button>
          {hasTeams ? (
            teams.map((team) => (
              <button
                key={team.id}
                type="button"
                className={`team-selector-option ${selectedTeamId === team.id ? "active" : ""}`}
                onClick={() => handleSelect(team.id)}
                role="option"
                aria-selected={selectedTeamId === team.id}
              >
                {team.name}
              </button>
            ))
          ) : (
            <div className="team-selector-empty">No teams configured</div>
          )}
        </div>
      )}
    </div>
  );
}

interface Team {
  id: string;
  name: string;
}

interface TeamSelectorProps {
  teams: Team[];
}
