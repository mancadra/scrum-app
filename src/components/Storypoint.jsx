function Storypoint({ storypoint, onAddTimeRequired }) {
  const showAddTimeButton = !storypoint.realised && !storypoint.assigned;

  return (
    <article className="storypoint-card">
      <div className="storypoint-card__header">
        <h3>{storypoint.name}</h3>
        <span className={`priority priority--${storypoint.priority.toLowerCase()}`}>
          {storypoint.priority}
        </span>
      </div>

      <p className="storypoint-card__description">{storypoint.description}</p>

      <div className="storypoint-card__meta">
        <div>
          <strong>Business Value:</strong> {storypoint.businessValue}
        </div>
        <div>
          <strong>Assigned:</strong> {storypoint.assigned ? "Yes" : "No"}
        </div>
        <div>
          <strong>Time Required:</strong>{" "}
          {storypoint.timeRequired !== null ? storypoint.timeRequired : "Not set"}
        </div>
      </div>

      <div className="storypoint-card__tests">
        <strong>Tests:</strong>
        <ul>
          {storypoint.tests.map((test, index) => (
            <li key={index}>{test}</li>
          ))}
        </ul>
      </div>

      <div className="storypoint-card__comment">
        <strong>Comment:</strong>
        <p>{storypoint.comment || "No comment yet."}</p>
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