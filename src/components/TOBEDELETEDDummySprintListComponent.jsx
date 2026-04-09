import React, { useState } from "react";
import AddSprintComponent from "./AddSprintComponent";
import "./TOBEDELETEDDummySprintListComponent.css";

console.log('THE FILE DummySprintListComponent.jsx WAS RUN, WE EXPECT TO DELETE IT');

export default function SprintPage() {
  const [showAddSprintModal, setShowAddSprintModal] = useState(false);
  const [sprints, setSprints] = useState([
    {
      id: 1,
      title: "Sprint Alpha",
      speed: 25,
      startDate: "2026-03-01",
      endDate: "2026-03-14",
    },
    {
      id: 2,
      title: "Sprint Beta",
      speed: 18,
      startDate: "2026-03-15",
      endDate: "2026-03-28",
    },
    {
      id: 3,
      title: "Sprint Gamma",
      speed: 30,
      startDate: "2026-03-29",
      endDate: "2026-04-11",
    },
  ]);

  const handleAddSprint = (newSprint) => {
    setSprints((currentSprints) => [
      ...currentSprints,
      {
        ...newSprint,
        id: Date.now(),
      },
    ]);
    setShowAddSprintModal(false);
  };

  return (
      <div className="sprint-page">
        <h1 className="sprint-page__title">Sprints</h1>

        <div className="sprint-page__grid">
          {sprints.map((sprint) => (
              <button
                  key={sprint.id}
                  type="button"
                  className="sprint-card"
                  onClick={() => {}}
              >
                <h2 className="sprint-card__title">{sprint.title}</h2>
                <p className="sprint-card__text">
                  <strong>Speed:</strong> {sprint.speed}
                </p>
                <p className="sprint-card__text">
                  <strong>Start Date:</strong> {sprint.startDate}
                </p>
                <p className="sprint-card__text">
                  <strong>End Date:</strong> {sprint.endDate}
                </p>
              </button>
          ))}
        </div>

        <div className="sprint-page__actions">
          <button
              className="sprint-page__add-button"
              onClick={() => setShowAddSprintModal(true)}
          >
            Add Sprint
          </button>
        </div>

        {showAddSprintModal && (
            <AddSprintComponent
                onClose={() => setShowAddSprintModal(false)}
                onAddSprint={handleAddSprint}
            />
        )}
      </div>
  );
}