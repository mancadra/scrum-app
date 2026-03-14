import React, { useState } from "react";

export default function AdminPage() {

  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "user"
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password || !formData.firstName || !formData.lastName || !formData.email) {
      setMessage("Izpolni vsa polja.");
      return;
    }

    const existing = users.find(u => u.username === formData.username);

    if (existing) {
      setMessage("Uporabniško ime že obstaja.");
      return;
    }

    setUsers([...users, formData]);
    setMessage("Uporabnik uspešno dodan.");

    setFormData({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "user"
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-10">

      <div className="w-full max-w-3xl">

        <h1 className="text-3xl font-bold mb-6 text-center">
          Upravljanje uporabnikov
        </h1>

        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">

          <h2 className="text-xl font-semibold mb-4">
            Dodaj novega uporabnika
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">

            <input
              className="border p-2 rounded"
              name="username"
              placeholder="Uporabniško ime"
              value={formData.username}
              onChange={handleChange}
            />

            <input
              className="border p-2 rounded"
              type="password"
              name="password"
              placeholder="Geslo"
              value={formData.password}
              onChange={handleChange}
            />

            <input
              className="border p-2 rounded"
              name="firstName"
              placeholder="Ime"
              value={formData.firstName}
              onChange={handleChange}
            />

            <input
              className="border p-2 rounded"
              name="lastName"
              placeholder="Priimek"
              value={formData.lastName}
              onChange={handleChange}
            />

            <input
              className="border p-2 rounded col-span-2"
              name="email"
              type="email"
              placeholder="E-pošta"
              value={formData.email}
              onChange={handleChange}
            />

            <select
              className="border p-2 rounded col-span-2"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="admin">Administrator sistema</option>
              <option value="user">Uporabnik sistema</option>
            </select>

            <button
              className="col-span-2 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
              type="submit"
            >
              Dodaj uporabnika
            </button>

          </form>

          {message && (
            <p className="mt-4 text-center text-sm text-gray-700">
              {message}
            </p>
          )}

        </div>


        <div className="bg-white shadow-lg rounded-xl p-6">

          <h2 className="text-xl font-semibold mb-4">
            Seznam uporabnikov
          </h2>

          {users.length === 0 && (
            <p className="text-gray-500">Ni dodanih uporabnikov.</p>
          )}

          <div className="space-y-3">

            {users.map((user, index) => (
              <div
                key={index}
                className="flex justify-between items-center border p-3 rounded"
              >
                <div>
                  <p className="font-semibold">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.email}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium">
                    @{user.username}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    user.role === "admin"
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-600"
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>
            ))}

          </div>

        </div>

      </div>

    </div>
  );
}