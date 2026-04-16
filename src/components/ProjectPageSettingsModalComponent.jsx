import React, { useEffect, useMemo, useState } from 'react';
import {
  addProjectMember,
  getProjectRoles,
  getUsers,
  removeProjectMember,
  updateProjectMemberRole,
  updateProjectName,
} from '../services/projects';
import './ProjectPageSettingsModalComponent.css';

const buildMemberRoleMap = (projectUsers) => {
  const map = {};
  for (const member of projectUsers) {
    map[member.FK_userId] = String(member.FK_projectRoleId);
  }
  return map;
};

const ProjectPageSettingsModalComponent = ({ project, projectUsers = [], onClose, onSaved }) => {
  const [projectName, setProjectName] = useState(project?.name || '');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const memberRoles = useMemo(() => buildMemberRoleMap(projectUsers), [projectUsers]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!project?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadingError('');
      setActionMessage('');
      setProjectName(project.name || '');

      try {
        const [loadedUsers, loadedRoles] = await Promise.all([getUsers(), getProjectRoles()]);

        if (cancelled) return;

        setUsers(loadedUsers);
        setRoles(loadedRoles);

        const developerRole =
            loadedRoles.find((role) => role.projectRole === 'Developer') || loadedRoles[0];

        setSelectedRoleId(developerRole ? String(developerRole.id) : '');
        setSelectedUserId('');
      } catch (err) {
        if (!cancelled) {
          setLoadingError(err?.message || 'Napaka pri nalaganju nastavitev projekta.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [project?.id, project?.name]);

  const memberRows = useMemo(() => {
    return projectUsers.map((member) => {
      const user = users.find((u) => u.id === member.FK_userId);
      const role = roles.find((r) => String(r.id) === String(member.FK_projectRoleId));

      return {
        ...member,
        user,
        role,
      };
    });
  }, [projectUsers, roles, users]);

  const availableUsers = useMemo(() => {
    const memberIds = new Set(projectUsers.map((member) => member.FK_userId));
    return users.filter((user) => !memberIds.has(user.id));
  }, [projectUsers, users]);

  const handleRenameProject = async (event) => {
    event.preventDefault();
    if (!project?.id) return;

    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setLoadingError('Ime projekta je obvezno.');
      return;
    }

    setSavingName(true);
    setLoadingError('');
    setActionMessage('');

    try {
      await updateProjectName(project.id, trimmedName);
      setActionMessage('Ime projekta je bilo posodobljeno.');
      if (onSaved) await onSaved();
    } catch (err) {
      setLoadingError(err?.message || 'Napaka pri shranjevanju imena projekta.');
    } finally {
      setSavingName(false);
    }
  };

  const handleAddMember = async () => {
    if (!project?.id || !selectedUserId || !selectedRoleId) return;

    setSavingMember(true);
    setLoadingError('');
    setActionMessage('');

    try {
      await addProjectMember(project.id, selectedUserId, Number(selectedRoleId));
      setActionMessage('Član je bil dodan v projekt.');
      setSelectedUserId('');
      if (onSaved) await onSaved();
    } catch (err) {
      setLoadingError(err?.message || 'Napaka pri dodajanju člana.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRoleChange = async (userId, nextRoleId) => {
    if (!project?.id) return;

    const previousRoleId = memberRoles[userId];
    setSavingMember(true);
    setLoadingError('');
    setActionMessage('');

    try {
      await updateProjectMemberRole(project.id, userId, Number(nextRoleId));
      setActionMessage('Vloga člana je bila posodobljena.');
      if (onSaved) await onSaved();
    } catch (err) {
      setLoadingError(err?.message || 'Napaka pri spreminjanju vloge.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!project?.id) return;

    const confirmed = window.confirm('Ali res želite odstraniti tega člana iz projekta?');
    if (!confirmed) return;

    setRemovingMemberId(userId);
    setLoadingError('');
    setActionMessage('');

    try {
      await removeProjectMember(project.id, userId);
      setActionMessage('Član je bil odstranjen iz projekta.');
      if (onSaved) await onSaved();
    } catch (err) {
      setLoadingError(err?.message || 'Napaka pri odstranjevanju člana.');
    } finally {
      setRemovingMemberId('');
    }
  };

  if (!project) return null;

  return (
      <div className="project-settings-modal" role="dialog" aria-modal="true" aria-labelledby="project-settings-title">
        <div className="project-settings-modal__backdrop" onClick={onClose} />
        <div className="project-settings-modal__panel">
          <div className="project-settings-modal__header">
            <h2 id="project-settings-title">Nastavitve projekta</h2>
            <button type="button" className="project-settings-modal__close" onClick={onClose} aria-label="Zapri">
              ×
            </button>
          </div>

          {loading ? (
              <p className="project-settings-modal__message">Nalagam nastavitve...</p>
          ) : (
              <>
                {loadingError && <div className="project-settings-modal__alert project-settings-modal__alert--error">{loadingError}</div>}
                {actionMessage && <div className="project-settings-modal__alert project-settings-modal__alert--success">{actionMessage}</div>}

                <form className="project-settings-modal__section" onSubmit={handleRenameProject}>
                  <h3>Ime projekta</h3>
                  <label className="project-settings-modal__field">
                    <span>Ime</span>
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Vnesite ime projekta"
                    />
                  </label>

                  <div className="project-settings-modal__actions">
                    <button type="submit" className="project-panel__button" disabled={savingName}>
                      {savingName ? 'Shranjevanje...' : 'Shrani ime'}
                    </button>
                  </div>
                </form>

                <div className="project-settings-modal__section">
                  <h3>Dodaj člana</h3>
                  <div className="project-settings-modal__grid">
                    <label className="project-settings-modal__field">
                      <span>Uporabnik</span>
                      <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                        <option value="">Izberi uporabnika</option>
                        {availableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.username}
                            </option>
                        ))}
                      </select>
                    </label>

                    <label className="project-settings-modal__field">
                      <span>Vloga</span>
                      <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
                        {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.projectRole}
                            </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="project-settings-modal__actions">
                    <button
                        type="button"
                        className="project-panel__button"
                        onClick={handleAddMember}
                        disabled={savingMember || !selectedUserId || !selectedRoleId}
                    >
                      Dodaj člana
                    </button>
                  </div>
                </div>

                <div className="project-settings-modal__section">
                  <h3>Člani projekta</h3>

                  {memberRows.length === 0 ? (
                      <p className="project-settings-modal__message">V projektu še ni članov.</p>
                  ) : (
                      <div className="project-settings-modal__members">
                        {memberRows.map((member) => (
                            <div key={`${member.FK_userId}-${member.FK_projectRoleId}`} className="project-settings-modal__member">
                              <div className="project-settings-modal__member-info">
                                <strong>{member.user?.username || 'Neznan uporabnik'}</strong>
                                <span>
                          {member.user?.name || ''} {member.user?.surname || ''}
                        </span>
                              </div>

                              <div className="project-settings-modal__member-controls">
                                <select
                                    value={memberRoles[member.FK_userId] || String(member.FK_projectRoleId)}
                                    onChange={(e) => handleRoleChange(member.FK_userId, e.target.value)}
                                    disabled={savingMember}
                                >
                                  {roles.map((role) => (
                                      <option key={role.id} value={role.id}>
                                        {role.projectRole}
                                      </option>
                                  ))}
                                </select>

                                <button
                                    type="button"
                                    className="project-settings-modal__danger-button"
                                    onClick={() => handleRemoveMember(member.FK_userId)}
                                    disabled={removingMemberId === member.FK_userId || savingMember}
                                >
                                  {removingMemberId === member.FK_userId ? 'Odstranjujem...' : 'Odstrani'}
                                </button>
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              </>
          )}
        </div>
      </div>
  );
};

export default ProjectPageSettingsModalComponent;