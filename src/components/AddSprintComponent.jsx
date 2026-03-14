import React, { useState } from "react";
import "./AddSprintComponent.css";

export default function AddSprintComponent({ onClose, onAddSprint }) {
  const [title, setTitle] = useState("");
  const [speed, setSpeed] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSaveSprint = () => {
    onAddSprint({
      title,
      speed: Number(speed),
      startDate,
      endDate,
    });
  };

  return (
    <div className="add-sprint-modal__overlay" onClick={onClose}>
      <div
        className="add-sprint-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="add-sprint-modal__title">Add Sprint</h2>

        <div className="add-sprint-modal__field">
          <label className="add-sprint-modal__label">Title</label>
          <input
            type="text"
            placeholder="Enter sprint title"
            className="add-sprint-modal__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="add-sprint-modal__field">
          <label className="add-sprint-modal__label">Speed</label>
          <input
            type="number"
            placeholder="Enter sprint speed"
            className="add-sprint-modal__input"
            value={speed}
            onChange={(event) => setSpeed(event.target.value)}
          />
        </div>

        <div className="add-sprint-modal__field">
          <label className="add-sprint-modal__label">Start Date</label>
          <input
            type="date"
            className="add-sprint-modal__input"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>

        <div className="add-sprint-modal__field">
          <label className="add-sprint-modal__label">End Date</label>
          <input
            type="date"
            className="add-sprint-modal__input"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="add-sprint-modal__actions">
          <button
            type="button"
            className="add-sprint-modal__button add-sprint-modal__button--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="add-sprint-modal__button add-sprint-modal__button--primary"
            onClick={handleSaveSprint}
          >
            Save Sprint
          </button>
        </div>
      </div>
    </div>
  );
}