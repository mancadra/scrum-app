import React, { useEffect } from 'react';
import { useStories } from '../hooks/useStories';
import { useTasks } from '../hooks/useTasks';
import UserStoryCard from '../components/UserStoryCard';
import TaskCard from '../components/TaskCard';

const SprintBacklogPage = ({ activeSprint }) => {
  const { stories } = useStories(activeSprint?.id);
  const { tasks, fetchTasks } = useTasks();

  useEffect(() => {
    if (activeSprint) {
      // Pridobimo vse naloge za ta sprint (prek vseh zgodb v njem)
      fetchTasks(); 
    }
  }, [activeSprint, fetchTasks]);

  // Kategorije za stolpce
  const columns = [
    { id: 'UNASSIGNED', title: 'Nedodeljene', status: 'PENDING' },
    { id: 'ASSIGNED', title: 'Dodeljene', status: 'ASSIGNED' },
    { id: 'ACTIVE', title: 'Aktivne', status: 'IN_PROGRESS' },
    { id: 'DONE', title: 'Zaključene', status: 'DONE' }
  ];

  return (
    <div className="container-fluid py-4">
      <h2 className="mb-4">Sprint Backlog: {activeSprint?.name}</h2>
      
      {stories.map(story => (
        <div key={story.id} className="mb-5 p-3 border rounded bg-light">
          <div className="mb-3">
            <UserStoryCard story={story} minimal={true} />
          </div>

          <div className="row g-2">
            {columns.map(col => (
              <div key={col.id} className="col-md-3">
                <div className="p-2 bg-secondary bg-opacity-10 rounded h-100">
                  <h6 className="text-uppercase small fw-bold mb-3">{col.title}</h6>
                  
                  {/* Filtriranje nalog za to zgodbo in ta stolpec */}
                  {tasks
                    .filter(t => t.story_id === story.id && t.status === col.status)
                    .map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        isActiveSprint={true} 
                      />
                    ))
                  }

                  {/* Če v stolpcu ni nalog, prikažemo prazno stanje */}
                  {tasks.filter(t => t.story_id === story.id && t.status === col.status).length === 0 && (
                    <div className="text-muted small text-center py-3 border border-dashed">
                      Ni nalog
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SprintBacklogPage;