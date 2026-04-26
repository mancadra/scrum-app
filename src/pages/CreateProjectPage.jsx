import React, { useEffect, useMemo, useState } from 'react'

const PROJECT_ROLE_LABELS = {
    'Product Owner': 'Produktni vodja',
    'Scrum Master': 'Skrbnik metodologije',
    'Developer': 'Razvijalec',
}

const EXCLUSIVE_ROLES = ['Product Owner', 'Scrum Master']
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
                setError('Napaka pri nalaganju uporabnikov ali vlog.')
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

        const developerRole = projectRoles.find((r) => r.projectRole === 'Developer')
        setProjectUsers((prev) => [
            ...prev,
            {
                id: userToAdd.id,
                username: userToAdd.username,
                name: userToAdd.name,
                surname: userToAdd.surname,
                projectRoleIds: developerRole ? [developerRole.id] : [],
            },
        ])

        setSelectedUserId('')
    }

    const handleRoleToggle = (userId, roleId) => {
        setProjectUsers((prev) =>
            prev.map((u) => {
                if (u.id !== userId) return u
                return {
                    ...u,
                    projectRoleIds: [roleId],
                }
            })
        )
    }

    const handleRemoveUser = (userId) => {
        setProjectUsers((prev) => prev.filter((u) => u.id !== userId))
    }

    const handleCreateProject = async () => {
        if (!projectName.trim()) return

        const noRolesUser = projectUsers.find((u) => u.projectRoleIds.length === 0)
        if (noRolesUser) {
            setError(`Uporabnik "${noRolesUser.username}" nima dodeljene nobene vloge.`)
            return
        }

        const productOwnerRole = projectRoles.find((r) => r.projectRole === 'Product Owner')
        const scrumMasterRole = projectRoles.find((r) => r.projectRole === 'Scrum Master')
        const hasProductOwner = projectUsers.some((u) => u.projectRoleIds.includes(productOwnerRole?.id))
        const hasScrumMaster = projectUsers.some((u) => u.projectRoleIds.includes(scrumMasterRole?.id))

        if (!hasProductOwner && !hasScrumMaster) {
            setError('Projekt mora imeti vsaj enega Produktnega vodjo in enega Skrbnika metodologije.')
            return
        }
        if (!hasProductOwner) {
            setError('Projekt mora imeti vsaj enega Produktnega vodjo.')
            return
        }
        if (!hasScrumMaster) {
            setError('Projekt mora imeti vsaj enega Skrbnika metodologije.')
            return
        }

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
                <h1 className="create-project-title">Ustvari Projekt</h1>
                <p className="create-project-subtitle">
                    Dodaj uporabnike in jim dodeli vloge
                </p>

                <div className="create-project-field">
                    <label htmlFor="projectName" className="create-project-label">
                        Ime Projekta
                    </label>
                    <input
                        id="projectName"
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Vstavi ime projekta"
                        className="create-project-input"
                    />
                </div>

                <div className="create-project-field">
                    <label htmlFor="description" className="create-project-label">
                        Opis
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Vstavi opis projekta (neobvezno)"
                        className="create-project-input"
                    />
                </div>

                <div className="create-project-add-row">
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="create-project-select"
                    >
                        <option value="">Izberi uporabnika</option>
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
                        Dodaj Uporabnika
                    </button>
                </div>

                <div className="create-project-list">
                    {projectUsers.length === 0 ? (
                        <p className="create-project-empty-text">Ni še dodanega uporabnika</p>
                    ) : (
                        projectUsers.map((user) => (
                            <div key={user.id} className="create-project-user-row">
                                <span className="create-project-user-name">
                                    {user.username} {user.name ? `(${user.name} ${user.surname ?? ''})` : ''}
                                </span>

                                <div className="create-project-roles">
                                    {projectRoles.map((role) => {
                                        const isExclusive = EXCLUSIVE_ROLES.includes(role.projectRole)
                                        const takenByOther = isExclusive &&
                                            !user.projectRoleIds.includes(role.id) &&
                                            projectUsers.some(u => u.id !== user.id && u.projectRoleIds.includes(role.id))
                                        return (
                                            <label
                                                key={role.id}
                                                className={`create-project-role-checkbox${takenByOther ? ' disabled' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`project-role-${user.id}`}
                                                    checked={user.projectRoleIds.includes(role.id)}
                                                    onChange={() => handleRoleToggle(user.id, role.id)}
                                                    disabled={takenByOther}
                                                />
                                                {PROJECT_ROLE_LABELS[role.projectRole] ?? role.projectRole}
                                            </label>
                                        )
                                    })}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleRemoveUser(user.id)}
                                    className="create-project-button"
                                >
                                    Odstrani
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
                        {loading ? 'Ustvarjanje...' : 'Ustvari Projekt'}
                    </button>
                </div>
                {error && <p className="error-badge">{error}</p>}
            </div>
        </div>
    )
}
