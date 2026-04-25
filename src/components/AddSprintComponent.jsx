 import React, { useState } from "react";
import "./AddSprintComponent.css";

export default function AddSprintComponent({ onClose, onAddSprint, loading, error }) {
  const [speed, setSpeed] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const formatDateInput = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);

    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  };

  const parseSlovenianDate = (value) => {
    const [day, month, year] = value.split(".").map(Number);

    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
  };

  const handleSaveSprint = async (event) => {
    event.preventDefault();

    if (!startDate || !endDate) return;

    const result = await onAddSprint({
      speed: Number(speed),
      startDate: parseSlovenianDate(startDate),
      endDate: parseSlovenianDate(endDate),
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
              placeholder="dd.mm.yyyy"
              value={startDate}
              onChange={(event) => setStartDate(formatDateInput(event.target.value))}
              maxLength={10}
            />
          </div>

          <div className="form-group">
            <label>Datum zaključka</label>
            <input
              type="text"
              placeholder="dd.mm.yyyy"
              value={endDate}
              onChange={(event) => setEndDate(formatDateInput(event.target.value))}
              maxLength={10}
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
