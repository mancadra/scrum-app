 import React, { useState } from "react";
import "./AddSprintComponent.css";

const formatDateInput = (value) => {
  const digits = String(value).replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
};

const toIsoDateTime = (value) => {
  const match = String(value).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  // Guard against invalid dates like 31.02.2026
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date.toISOString();
};

export default function AddSprintComponent({ onClose, onAddSprint, loading, error }) {
  const [speed, setSpeed] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSaveSprint = async (event) => {
    event.preventDefault();

    const startingDate = toIsoDateTime(startDate);
    const endingDate = toIsoDateTime(endDate);

    if (!startingDate || !endingDate) {
      return;
    }

    const result = await onAddSprint({
      speed: Number(speed),
      startDate: startingDate,
      endDate: endingDate,
    });

    if (result) {
      onClose();
    }
  };

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div
        className="sidebar-container add-sprint-sidebar"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sidebar-header">
          <h2>Dodaj Sprint</h2>
          <button type="button" onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        <form className="sprint-form" onSubmit={handleSaveSprint}>
          <div className="form-group">
            <label>Hitrost</label>
            <input
              type="number"
              placeholder="Vstavite hitrost sprinta (točke)"
              value={speed}
              onChange={(event) => setSpeed(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Datum začetka</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd.mm.yyyy"
              value={startDate}
              onChange={(event) => setStartDate(formatDateInput(event.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Datum zaključka</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd.mm.yyyy"
              value={endDate}
              onChange={(event) => setEndDate(formatDateInput(event.target.value))}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Shranjevanje..." : "Shrani Sprint"}
          </button>
          {error && <p className="error-badge">{error}</p>}
        </form>
      </div>
    </div>
  );
}