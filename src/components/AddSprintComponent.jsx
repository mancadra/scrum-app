import React, { useState } from "react";
import "./AddSprintComponent.css";

export default function AddSprintComponent({ onClose, onAddSprint, loading, error }) {
  const [speed, setSpeed] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSaveSprint = async (event) => {
    event.preventDefault();

    const result = await onAddSprint({
      speed: Number(speed),
      startDate,
      endDate,
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
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Datum zaključka</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
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