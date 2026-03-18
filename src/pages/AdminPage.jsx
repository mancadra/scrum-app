import React, { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { getUsers } from "../services/projects";
import "./AdminPage.css"; // Uvozi novo CSS datoteko

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "", password: "", firstName: "", lastName: "", email: "", role: "User"
  });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) { console.error(err); }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", { body: formData });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      setMessage("Uporabnik uspešno dodan.");
      setMessageType("success");
      setFormData({ username: "", password: "", firstName: "", lastName: "", email: "", role: "User" });
      loadUsers();
    } catch (err) {
      setMessage(err.message);
      setMessageType("error");
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="admin-title">Upravljanje uporabnikov</h1>

        {/* Sekcija za dodajanje */}
        <div className="admin-card">
          <h2 className="card-title">Dodaj novega uporabnika</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <input name="firstName" placeholder="Ime" value={formData.firstName} onChange={handleChange} />
              <input name="lastName" placeholder="Priimek" value={formData.lastName} onChange={handleChange} />
            </div>
            <input name="username" placeholder="Uporabniško ime" value={formData.username} onChange={handleChange} />
            <input type="email" name="email" placeholder="E-pošta" value={formData.email} onChange={handleChange} />
            <input type="password" name="password" placeholder="Geslo" value={formData.password} onChange={handleChange} />
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="Admin">Administrator sistema</option>
              <option value="User">Uporabnik sistema</option>
            </select>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? "Dodajam..." : "Dodaj uporabnika"}
            </button>
          </form>
          {message && <p className={`message ${messageType}`}>{message}</p>}
        </div>

        {/* Seznam uporabnikov */}
<div className="admin-card">
  <h2 className="card-title">Seznam uporabnikov</h2>
  <div className="user-list-container"> 
    <div className="user-list">
      {users.length === 0 ? (
        <p className="empty-msg">Ni uporabnikov.</p>
      ) : (
        users.map((user) => (
          <div key={user.id} className="user-item">
            <div className="user-info">
              <strong>{user.name} {user.surname}</strong>
              <span>{user.email}</span>
            </div>
            <div className="user-badge">
              <span className="username">@{user.username}</span>
              <span className={`role-tag ${user.UserRoles?.[0]?.Roles?.name === 'Admin' ? 'admin' : 'user'}`}>
                {user.UserRoles?.[0]?.Roles?.name || 'User'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
</div>
      </div>
    </div>
  );
}