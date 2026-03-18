function Storypoint({ storypoint, onAddTimeRequired, isAssigned }) {
  const showAddTimeButton = !storypoint.realized && !isAssigned;

  return (
    <article className="storypoint-card">
      <div className="storypoint-card__header">
        <h3>{storypoint.name}</h3>
        {storypoint.FK_priorityId && (
          <span className="priority">
            Priority: {storypoint.FK_priorityId}
          </span>
        )}
      </div>

      <p className="storypoint-card__description">{storypoint.description}</p>

      <div className="storypoint-card__meta">
        <div>
          <strong>Business Value:</strong> {storypoint.businessValue}
        </div>
        <div>
          <strong>Accepted:</strong> {storypoint.accepted ? "Yes" : "No"}
        </div>
        <div>
          <strong>Time Complexity:</strong>{" "}
          {storypoint.timeComplexity !== null ? storypoint.timeComplexity : "Not set"}
        </div>
      </div>

      {showAddTimeButton && (
        <button
          type="button"
          className="storypoint-card__button"
          onClick={() => onAddTimeRequired(storypoint)}
        >
          Add time required
        </button>
      )}
    </article>
  );
}

export default Storypoint;