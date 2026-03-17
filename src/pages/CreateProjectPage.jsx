import React, { useEffect, useMemo, useState } from 'react'
import './CreateProjectPage.css'
import { getUsers, getProjectRoles, createProject } from '../services/projects'

export default function CreateProjectPage({ onProjectCreated }) {
    const [projectName, setProjectName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedUserId, setSelectedUserId] = useState('')
    const [projectUsers, setProjectUsers] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [projectRoles, setProjectRoles] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadData() {
            try {
                const [users, roles] = await Promise.all([getUsers(), getProjectRoles()])
                setAllUsers(users)
                setProjectRoles(roles)
            } catch (err) {
                setError('Failed to load users or roles.')
            }
        }
        loadData()
    }, [])

    const availableUsers = useMemo(() => {
        return allUsers.filter(
            (user) => !projectUsers.some((pu) => pu.id === user.id)
        )
    }, [allUsers, projectUsers])

    const handleAddUser = () => {
        if (!selectedUserId || projectRoles.length === 0) return

        const userToAdd = allUsers.find((u) => u.id === selectedUserId)
        if (!userToAdd) return

        setProjectUsers((prev) => [
            ...prev,
            {
                id: userToAdd.id,
                username: userToAdd.username,
                name: userToAdd.name,
                surname: userToAdd.surname,
                projectRoleId: projectRoles[0].id,
            },
        ])

        setSelectedUserId('')
    }

    const handleRoleChange = (userId, projectRoleId) => {
        setProjectUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, projectRoleId: Number(projectRoleId) } : u))
        )
    }

    const handleRemoveUser = (userId) => {
        setProjectUsers((prev) => prev.filter((u) => u.id !== userId))
    }

    const handleCreateProject = async () => {
        if (!projectName.trim()) return

        setLoading(true)
        setError('')

        try {
            const project = await createProject(projectName.trim(), description.trim(), projectUsers)

            setProjectName('')
            setDescription('')
            setSelectedUserId('')
            setProjectUsers([])

            if (onProjectCreated) onProjectCreated(project)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="create-project-page">
            <div className="create-project-card">
                <h1 className="create-project-title">Create Project</h1>
                <p className="create-project-subtitle">
                    Add users and assign a role to each one.
                </p>

                {error && <p className="create-project-error">{error}</p>}

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

                <div className="create-project-field">
                    <label htmlFor="description" className="create-project-label">
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter project description (optional)"
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
                                {user.username} {user.name ? `(${user.name} ${user.surname ?? ''})` : ''}
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
                                <span className="create-project-user-name">
                                    {user.username} {user.name ? `(${user.name} ${user.surname ?? ''})` : ''}
                                </span>

                                <select
                                    value={user.projectRoleId}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className="create-project-select"
                                >
                                    {projectRoles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.projectRole}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={() => handleRemoveUser(user.id)}
                                    className="create-project-button"
                                >
                                    Remove
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="create-project-footer">
                    <button
                        type="button"
                        onClick={handleCreateProject}
                        disabled={!projectName.trim() || loading}
                        className="create-project-button"
                    >
                        {loading ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </div>
        </div>
    )
}
