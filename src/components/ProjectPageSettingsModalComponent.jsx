import React, { useEffect, useMemo, useState } from 'react';
import {
  addProjectMember,
  getProjectRoles,
  getUsers,
  removeProjectMember,
  removeProjectMemberRole,
  updateProjectName,
} from '../services/projects';
import './ProjectPageSettingsModalComponent.css';

const PROJECT_ROLE_LABELS = {
  'Product Owner': 'Produktni vodja',
  'Scrum Master': 'Skrbnik metodologije',
  'Developer': 'Razvijalec',
};

// Roles that may only be held by one project member at a time.
const EXCLUSIVE_ROLES = ['Product Owner', 'Scrum Master'];

const ProjectPageSettingsModalComponent = ({ project, projectUsers = [], onClose, onSaved }) => {
  const [projectName, setProjectName] = useState(project?.name || '');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newMemberRoleIds, setNewMemberRoleIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState('');
  const [togglingRole, setTogglingRole] = useState(null); // { userId, roleId }
  const [actionMessage, setActionMessage] = useState('');

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

        const developerRole = loadedRoles.find((r) => r.projectRole === 'Developer') || loadedRoles[0];
        setNewMemberRoleIds(developerRole ? [String(developerRole.id)] : []);
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

    return () => { cancelled = true; };
  }, [project?.id, project?.name]);

  // Group projectUsers by userId so each user appears exactly once.
  const memberRows = useMemo(() => {
    const map = new Map();
    for (const member of projectUsers) {
      const uid = member.FK_userId;
      if (!map.has(uid)) {
        const user = users.find((u) => u.id === uid);
        map.set(uid, { userId: uid, user, roleIds: new Set() });
      }
      map.get(uid).roleIds.add(String(member.FK_projectRoleId));
    }
    return Array.from(map.values());
  }, [projectUsers, users]);

  const availableUsers = useMemo(() => {
    const memberIds = new Set(projectUsers.map((m) => m.FK_userId));
    return users.filter((u) => !memberIds.has(u.id));
  }, [projectUsers, users]);

  // Set of roleIds that are exclusive (Product Owner, Scrum Master).
  const exclusiveRoleIds = useMemo(
    () => new Set(roles.filter((r) => EXCLUSIVE_ROLES.includes(r.projectRole)).map((r) => String(r.id))),
    [roles],
  );

  // Maps exclusive roleId → the userId that currently holds it.
  const takenExclusiveRoles = useMemo(() => {
    const map = new Map();
    for (const { userId, roleIds } of memberRows) {
      for (const roleId of roleIds) {
        if (exclusiveRoleIds.has(roleId)) map.set(roleId, userId);
      }
    }
    return map;
  }, [memberRows, exclusiveRoleIds]);

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

  const handleNewMemberRoleToggle = (roleId) => {
    const id = String(roleId);
    setNewMemberRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleAddMember = async () => {
    if (!project?.id || !selectedUserId || newMemberRoleIds.length === 0) return;

    // Guard exclusive roles before touching the DB.
    for (const roleId of newMemberRoleIds) {
      const takenBy = takenExclusiveRoles.get(roleId);
      if (takenBy) {
        const role = roles.find((r) => String(r.id) === roleId);
        const holder = memberRows.find((m) => m.userId === takenBy);
        const holderName = holder?.user?.username || 'drug član';
        setLoadingError(
          `Vloga "${PROJECT_ROLE_LABELS[role?.projectRole] ?? role?.projectRole}" je že dodeljena članu ${holderName}. Najprej mu jo odvzemite.`
        );
        return;
      }
    }

    setSavingMember(true);
    setLoadingError('');
    setActionMessage('');

    try {
      for (const roleId of newMemberRoleIds) {
        await addProjectMember(project.id, selectedUserId, Number(roleId));
      }
      setActionMessage('Član je bil dodan v projekt.');
      setSelectedUserId('');
      const developerRole = roles.find((r) => r.projectRole === 'Developer') || roles[0];
      setNewMemberRoleIds(developerRole ? [String(developerRole.id)] : []);
      if (onSaved) await onSaved();
    } catch (err) {
      setLoadingError(err?.message || 'Napaka pri dodajanju člana.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRoleToggle = async (userId, roleId, currentlyHas) => {
    if (!project?.id) return;

    const row = memberRows.find((r) => r.userId === userId);

    if (currentlyHas && row?.roleIds.size === 1) {
      setLoadingError('Član mora imeti vsaj eno vlogo. Če ga želite odstraniti, uporabite gumb Odstrani.');
      return;
    }

    if (!currentlyHas && exclusiveRoleIds.has(roleId)) {
      const takenBy = takenExclusiveRoles.get(roleId);
      if (takenBy && takenBy !== userId) {
        const role = roles.find((r) => String(r.id) === roleId);
        const holder = memberRows.find((m) => m.userId === takenBy);
        const holderName = holder?.user?.username || 'drug član';
        setLoadingError(
          `Vloga "${PROJECT_ROLE_LABELS[role?.projectRole] ?? role?.projectRole}" je že dodeljena članu ${holderName}. Najprej mu jo odvzemite.`
        );
        return;
      }
    }

    setTogglingRole({ userId, roleId });
    setLoadingError('');
    setActionMessage('');

    try {
      if (currentlyHas) {
        await removeProjectMemberRole(project.id, userId, Number(roleId));
      } else {
        await addProjectMember(project.id, userId, Number(roleId));
      }
      setActionMessage('Vloga člana je bila posodobljena.');
      if (onSaved) await onSaved();
    } catch (err) {
      setLoadingError(err?.message || 'Napaka pri spreminjanju vloge.');
    } finally {
      setTogglingRole(null);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!project?.id) return;

    if (!window.confirm('Ali res želite odstraniti tega člana iz projekta?')) return;

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
            {loadingError && (
              <div className="project-settings-modal__alert project-settings-modal__alert--error">
                {loadingError}
              </div>
            )}
            {actionMessage && (
              <div className="project-settings-modal__alert project-settings-modal__alert--success">
                {actionMessage}
              </div>
            )}

            {/* ── Rename project ── */}
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

            {/* ── Add new member ── */}
            <div className="project-settings-modal__section">
              <h3>Dodaj člana</h3>
              <label className="project-settings-modal__field">
                <span>Uporabnik</span>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  <option value="">Izberi uporabnika</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}{user.name ? ` (${user.name} ${user.surname ?? ''})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div className="project-settings-modal__field">
                <span>Vloge</span>
                <div className="project-settings-modal__role-checkboxes">
                  {roles.map((role) => {
                    const roleId = String(role.id);
                    const takenBy = takenExclusiveRoles.get(roleId);
                    const takenByOther = !!takenBy;
                    const holder = takenByOther ? memberRows.find((m) => m.userId === takenBy) : null;
                    return (
                      <label
                        key={role.id}
                        className="project-settings-modal__role-checkbox"
                        title={takenByOther ? `Že dodeljeno: ${holder?.user?.username ?? 'drug član'}` : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={newMemberRoleIds.includes(roleId)}
                          onChange={() => handleNewMemberRoleToggle(role.id)}
                          disabled={!selectedUserId || takenByOther}
                        />
                        {PROJECT_ROLE_LABELS[role.projectRole] ?? role.projectRole}
                        {takenByOther && (
                          <span className="project-settings-modal__role-taken">
                            ({holder?.user?.username ?? 'zasedeno'})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="project-settings-modal__actions">
                <button
                  type="button"
                  className="project-panel__button"
                  onClick={handleAddMember}
                  disabled={savingMember || !selectedUserId || newMemberRoleIds.length === 0}
                >
                  {savingMember ? 'Dodajanje...' : 'Dodaj člana'}
                </button>
              </div>
            </div>

            {/* ── Existing members ── */}
            <div className="project-settings-modal__section">
              <h3>Člani projekta</h3>

              {memberRows.length === 0 ? (
                <p className="project-settings-modal__message">V projektu še ni članov.</p>
              ) : (
                <div className="project-settings-modal__members">
                  {memberRows.map(({ userId, user, roleIds }) => (
                    <div key={userId} className="project-settings-modal__member">
                      <div className="project-settings-modal__member-info">
                        <strong>{user?.username || 'Neznan uporabnik'}</strong>
                        <span>{user?.name || ''} {user?.surname || ''}</span>
                      </div>

                      <div className="project-settings-modal__member-controls">
                        <div className="project-settings-modal__role-checkboxes">
                          {roles.map((role) => {
                            const roleId = String(role.id);
                            const has = roleIds.has(roleId);
                            const busy = togglingRole?.userId === userId && togglingRole?.roleId === roleId;
                            const takenBy = takenExclusiveRoles.get(roleId);
                            const takenByOther = !has && !!takenBy && takenBy !== userId;
                            const holder = takenByOther ? memberRows.find((m) => m.userId === takenBy) : null;
                            return (
                              <label
                                key={role.id}
                                className="project-settings-modal__role-checkbox"
                                title={takenByOther ? `Že dodeljeno: ${holder?.user?.username ?? 'drug član'}` : undefined}
                              >
                                <input
                                  type="checkbox"
                                  checked={has}
                                  disabled={busy || !!togglingRole || removingMemberId === userId || takenByOther}
                                  onChange={() => handleRoleToggle(userId, roleId, has)}
                                />
                                {PROJECT_ROLE_LABELS[role.projectRole] ?? role.projectRole}
                                {takenByOther && (
                                  <span className="project-settings-modal__role-taken">
                                    ({holder?.user?.username ?? 'zasedeno'})
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          className="project-settings-modal__danger-button"
                          onClick={() => handleRemoveMember(userId)}
                          disabled={removingMemberId === userId || !!togglingRole}
                        >
                          {removingMemberId === userId ? 'Odstranjujem...' : 'Odstrani'}
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
