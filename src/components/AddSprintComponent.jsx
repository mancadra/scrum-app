import React, { useState } from "react";
import "./AddSprintComponent.css";

export default function AddSprintComponent({ onClose, onAddSprint, loading }) {
  const [title, setTitle] = useState("");
  const [speed, setSpeed] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSaveSprint = async (event) => {
    event.preventDefault();

    const result = await onAddSprint({
      title,
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
          <h2>Add Sprint</h2>
          <button type="button" onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        <form className="sprint-form" onSubmit={handleSaveSprint}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              placeholder="Enter sprint title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Speed</label>
            <input
              type="number"
              placeholder="Enter sprint speed"
              value={speed}
              onChange={(event) => setSpeed(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Saving..." : "Save Sprint"}
          </button>
        </form>
      </div>
    </div>
  );
}