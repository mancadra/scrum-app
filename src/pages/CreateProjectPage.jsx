import React, { useMemo, useState } from 'react'
import './CreateProjectPage.css'

const dummyUsers = [
    { id: 1, name: 'Alice Johnson' },
    { id: 2, name: 'Bob Smith' },
    { id: 3, name: 'Charlie Brown' },
    { id: 4, name: 'Diana Prince' },
    { id: 5, name: 'Ethan Clark' },
]

const roles = ['Viewer', 'Editor', 'Admin']

export default function CreateProjectPage({ onProjectCreated }) {
    const [projectName, setProjectName] = useState('')
    const [selectedUserId, setSelectedUserId] = useState('')
    const [projectUsers, setProjectUsers] = useState([])

    const availableUsers = useMemo(() => {
        return dummyUsers.filter(
            (user) => !projectUsers.some((projectUser) => projectUser.id === user.id)
        )
    }, [projectUsers])

    const handleAddUser = () => {
        if (!selectedUserId) return

        const userToAdd = dummyUsers.find(
            (user) => user.id === Number(selectedUserId)
        )

        if (!userToAdd) return

        setProjectUsers((prev) => [
            ...prev,
            {
                ...userToAdd,
                role: 'Viewer',
            },
        ])

        setSelectedUserId('')
    }

    const handleRoleChange = (userId, role) => {
        setProjectUsers((prev) =>
            prev.map((user) => (user.id === userId ? { ...user, role } : user))
        )
    }

    const handleCreateProject = () => {
        if (!projectName.trim()) return

        const newProject = {
            name: projectName.trim(),
            users: projectUsers,
        }

        console.log('Project created:', newProject)

        setProjectName('')
        setSelectedUserId('')
        setProjectUsers([])

        if (onProjectCreated) {
            onProjectCreated(newProject)
        }
    }

    return (
        <div className="create-project-page">
            <div className="create-project-card">
                <h1 className="create-project-title">Create Project</h1>
                <p className="create-project-subtitle">
                    Add users and assign a role to each one.
                </p>

                <div className="create-project-field">
                    <label htmlFor="projectName" className="create-project-label">
                        Project Name
                    </label>
                    <input
                        id="projectName"
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Enter project name"
                        className="create-project-input"
                    />
                </div>

                <div className="create-project-add-row">
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="create-project-select"
                    >
                        <option value="">Select a user</option>
                        {availableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={handleAddUser}
                        disabled={!selectedUserId}
                        className="create-project-button"
                    >
                        Add User
                    </button>
                </div>

                <div className="create-project-list">
                    {projectUsers.length === 0 ? (
                        <p className="create-project-empty-text">No users added yet.</p>
                    ) : (
                        projectUsers.map((user) => (
                            <div key={user.id} className="create-project-user-row">
                                <span className="create-project-user-name">{user.name}</span>

                                <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className="create-project-select"
                                >
                                    {roles.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))
                    )}
                </div>

                <div className="create-project-footer">
                    <button
                        type="button"
                        onClick={handleCreateProject}
                        disabled={!projectName.trim()}
                        className="create-project-button"
                    >
                        Create Project
                    </button>
                </div>
            </div>
        </div>
    )
}