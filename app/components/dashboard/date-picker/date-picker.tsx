import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { buildSearchParams, type DatePreset, type DateRange, formatDateRange, parseDateRange } from "~/lib/dashboard/date-range.js";
import "./date-picker.css";

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "60d", label: "60d" },
  { value: "90d", label: "90d" },
];

export function DatePicker() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dateRange = parseDateRange(searchParams);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dateRange.preset === "custom") {
      setCustomStart(dateRange.startDate.toISOString().split("T")[0]);
      setCustomEnd(dateRange.endDate.toISOString().split("T")[0]);
    }
  }, [dateRange.preset, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsCustomOpen(false);
      }
    };

    if (isCustomOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isCustomOpen]);

  const handlePresetClick = useCallback(
    (preset: DatePreset) => {
      const newRange: DateRange = {
        startDate: new Date(),
        endDate: new Date(),
        preset,
      };
      const params = buildSearchParams(newRange);
      navigate(`?${params.toString()}`);
    },
    [navigate]
  );

  const handleCustomApply = useCallback(() => {
    if (!customStart || !customEnd) return;

    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);

    if (startDate > endDate) return;

    const newRange: DateRange = {
      startDate,
      endDate,
      preset: "custom",
    };
    const params = buildSearchParams(newRange);
    navigate(`?${params.toString()}`);
    setIsCustomOpen(false);
  }, [customStart, customEnd, navigate]);

  const isValidCustomRange = customStart && customEnd && new Date(customStart) <= new Date(customEnd);

  return (
    <div className="date-picker">
      {PRESETS.map(({ value, label }) => (
        <button key={value} type="button" className={`date-btn ${dateRange.preset === value ? "active" : ""}`} onClick={() => handlePresetClick(value)}>
          {label}
        </button>
      ))}
      <div className="date-picker-custom-wrapper" ref={modalRef}>
        <button type="button" className={`date-btn ${dateRange.preset === "custom" ? "active" : ""}`} onClick={() => setIsCustomOpen(!isCustomOpen)}>
          {dateRange.preset === "custom" ? formatDateRange(dateRange) : "Custom"}
        </button>
        {isCustomOpen && (
          <div className="date-picker-modal">
            <div className="date-picker-field">
              <label htmlFor="custom-start">Start Date</label>
              <input id="custom-start" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} max={customEnd || undefined} />
            </div>
            <div className="date-picker-field">
              <label htmlFor="custom-end">End Date</label>
              <input
                id="custom-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart || undefined}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <button type="button" className="date-picker-apply" onClick={handleCustomApply} disabled={!isValidCustomRange}>
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
