import { useState } from "react";
import "./UserStory.css";

function AddUserStoryPage() {

  const [stories, setStories] = useState([]);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tests: "",
    priority: "must",
    businessValue: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.tests || !formData.businessValue) {
      setMessage("Izpolni vsa polja.");
      return;
    }

    setStories([...stories, formData]);
    setMessage("Uporabniška zgodba uspešno dodana.");

    setFormData({
      name: "",
      description: "",
      tests: "",
      priority: "must",
      businessValue: ""
    });
  };

  return (
    <div className="story-container">

      <h2>Dodaj uporabniško zgodbo</h2>

      <form className="story-form" onSubmit={handleSubmit}>

        <input
          name="name"
          placeholder="Ime zgodbe"
          value={formData.name}
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Opis zgodbe"
          value={formData.description}
          onChange={handleChange}
        />

        <textarea
          name="tests"
          placeholder="Sprejemni testi"
          value={formData.tests}
          onChange={handleChange}
        />

        <select
          name="priority"
          value={formData.priority}
          onChange={handleChange}
        >
          <option value="must">Must Have</option>
          <option value="should">Should Have</option>
          <option value="could">Could Have</option>
          <option value="wont">Won't Have This Time</option>
        </select>

        <input
          type="number"
          name="businessValue"
          placeholder="Poslovna vrednost"
          value={formData.businessValue}
          onChange={handleChange}
        />

        <button type="submit">
          Dodaj zgodbo
        </button>

      </form>

      {message && <p className="message">{message}</p>}

      <h3>Seznam uporabniških zgodb</h3>

      <div className="story-list">

        {stories.map((story, index) => (
          <div className="story-card" key={index}>

            <h4>{story.name}</h4>

            <p><strong>Opis:</strong> {story.description}</p>

            <p><strong>Sprejemni testi:</strong> {story.tests}</p>

            <p><strong>Prioriteta:</strong> {story.priority}</p>

            <p><strong>Poslovna vrednost:</strong> {story.businessValue}</p>

          </div>
        ))}

      </div>

    </div>
  );
}

export default AddUserStoryPage;