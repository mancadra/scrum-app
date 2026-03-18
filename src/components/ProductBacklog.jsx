import Storypoint from "./Storypoint";
import "./ProductBacklog.css";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getRealizedStories, getAssignedStories, getUnassignedStories } from "../services/productBacklog";

function ProductBacklog() {
  const { projectId } = useParams()
  const [realized, setRealized] = useState([])
  const [assigned, setAssigned] = useState([])
  const [unassigned, setUnassigned] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedStorypoint, setSelectedStorypoint] = useState(null)
  const [timeRequiredInput, setTimeRequiredInput] = useState("")

  useEffect(() => {
    async function loadBacklog() {
      setLoading(true)
      setError(null)
      try {
        const [realizedData, assignedData, unassignedData] = await Promise.all([
          getRealizedStories(projectId),
          getAssignedStories(projectId),
          getUnassignedStories(projectId),
        ])
        setRealized(realizedData)
        setAssigned(assignedData)
        setUnassigned(unassignedData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadBacklog()
  }, [projectId])

  const openTimeRequiredModal = (storypoint) => {
    setSelectedStorypoint(storypoint)
    setTimeRequiredInput(storypoint.timeComplexity !== null ? String(storypoint.timeComplexity) : "")
  }

  const closeTimeRequiredModal = () => {
    setSelectedStorypoint(null)
    setTimeRequiredInput("")
  }

  const handleSaveTimeRequired = () => {
    const parsedValue = Number(timeRequiredInput)
    if (!timeRequiredInput || Number.isNaN(parsedValue) || parsedValue < 0) return

    // Update locally for now — wire up to DB when that endpoint is ready
    const updateList = (list) =>
      list.map(s => s.id === selectedStorypoint.id ? { ...s, timeComplexity: parsedValue } : s)

    setRealized(updateList)
    setAssigned(updateList)
    setUnassigned(updateList)
    closeTimeRequiredModal()
  }

  const renderStorypoints = (items, isAssigned = false) => {
    if (items.length === 0) {
      return <p className="empty-state">No storypoints in this category.</p>
    }
    return (
      <div className="storypoint-grid">
        {items.map((storypoint) => (
          <Storypoint
            key={storypoint.id}
            storypoint={storypoint}
            isAssigned={isAssigned}
            onAddTimeRequired={openTimeRequiredModal}
          />
        ))}
      </div>
    )
  }

  if (loading) return <p>Loading backlog...</p>
  if (error) return <p className="error">{error}</p>

  return (
    <main className="product-backlog">
      <h1>Product Backlog</h1>

      <section className="backlog-section">
        <h2>Realised</h2>
        {renderStorypoints(realized)}
      </section>

      <section className="backlog-section">
        <h2>Not Realised</h2>
        <div className="nested-section">
          <h3>Assigned</h3>
          {renderStorypoints(assigned, true)}
        </div>
        <div className="nested-section">
          <h3>Unassigned</h3>
          {renderStorypoints(unassigned, false)}
        </div>
      </section>

      {selectedStorypoint && (
        <div className="modal-overlay" onClick={closeTimeRequiredModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Time Required</h2>
            <p className="modal__subtitle">{selectedStorypoint.name}</p>
            <label className="modal__label" htmlFor="timeRequired">Time required</label>
            <input
              id="timeRequired"
              className="modal__input"
              type="number"
              min="0"
              step="1"
              value={timeRequiredInput}
              onChange={(e) => setTimeRequiredInput(e.target.value)}
            />
            <div className="modal__actions">
              <button type="button" className="modal__button modal__button--secondary" onClick={closeTimeRequiredModal}>
                Cancel
              </button>
              <button type="button" className="modal__button modal__button--primary" onClick={handleSaveTimeRequired}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default ProductBacklog