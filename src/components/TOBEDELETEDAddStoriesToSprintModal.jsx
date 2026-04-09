
console.log('THE FILE AddStoriesToSprintModal.jsx WAS RUN, WE EXPECT TO DELETE IT');

const TOBEDELETEDAddStoriesToSprintModal = ({ projectId, currentSprintId, onUpdated }) => {
  const [availableStories, setAvailableStories] = useState([]);
  
  // Naloži zgodbe projekta, ki so ocenjene in niso v sprintu
  useEffect(() => {
    const fetchEligibleStories = async () => {
      const { data } = await supabase
        .from('UserStories')
        .select('*')
        .eq('FK_projectId', projectId)
        .gt('timecomplexity', 0) // Samo ocenjene
        .is('is_realized', false) // Nerealizirane
        // Tu bi dodali še filter, da niso v drugih aktivnih sprintih
      setAvailableStories(data);
    };
    fetchEligibleStories();
  }, [projectId]);

  const handleAddToSprint = async (storyId) => {
    // Posodobi UserStory, da kaže na trenutni sprint
    await supabase
      .from('UserStories')
      .update({ FK_sprintId: currentSprintId })
      .eq('id', storyId);
    onUpdated();
  };

  return (
    <div className="list-group">
      {availableStories.map(story => (
        <div key={story.id} className="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <span className="fw-bold">{story.name}</span>
            <br/><small className="text-muted">Točke: {story.timecomplexity}</small>
          </div>
          <button className="btn btn-sm btn-success" onClick={() => handleAddToSprint(story.id)}>
            Dodaj v Sprint
          </button>
        </div>
      ))}
    </div>
  );
};