import React, { useEffect, useMemo, useState } from 'react';
import {
  getProjectRoles,
  getUsers,
  saveProjectMembers,
  updateProjectName,
} from '../services/projects';
import './ProjectPageSettingsModalComponent.css';

const PROJECT_ROLE_LABELS = {
  'Product Owner': 'Produktni vodja',
  'Scrum Master': 'Skrbnik metodologije',
  'Developer': 'Razvijalec',
};

const EXCLUSIVE_ROLES = ['Product Owner', 'Scrum Master'];

const ProjectPageSettingsModalComponent = ({ project, projectUsers = [], onClose, onSaved }) => {
  const [localName, setLocalName] = useState(project?.name || '');
  const [localMembers, setLocalMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingError, setLoadingError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      if (!project?.id) { setLoading(false); return; }
      setLoading(true);
      setLoadingError('');
      setLocalName(project.name || '');
      setSaveError('');
      setSaveSuccess('');
      try {
        const [loadedUsers, loadedRoles] = await Promise.all([getUsers(), getProjectRoles()]);
        if (cancelled) return;
        setAllUsers(loadedUsers);
        setRoles(loadedRoles);

        const map = new Map();
        for (const member of projectUsers) {
          const uid = member.FK_userId;
          if (!map.has(uid)) {
            const user = loadedUsers.find(u => u.id === uid);
            map.set(uid, { userId: uid, user, roleIds: new Set() });
          }
          map.get(uid).roleIds.add(String(member.FK_projectRoleId));
        }
        setLocalMembers(Array.from(map.values()));
        setSelectedUserId('');
      } catch (err) {
        if (!cancelled) setLoadingError(err?.message || 'Napaka pri nalaganju nastavitev projekta.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [project?.id, project?.name, projectUsers]);

  const exclusiveRoleIds = useMemo(
    () => new Set(roles.filter(r => EXCLUSIVE_ROLES.includes(r.projectRole)).map(r => String(r.id))),
    [roles],
  );

  const takenExclusiveRoles = useMemo(() => {
    const map = new Map();
    for (const { userId, roleIds } of localMembers) {
      for (const roleId of roleIds) {
        if (exclusiveRoleIds.has(roleId)) map.set(roleId, userId);
      }
    }
    return map;
  }, [localMembers, exclusiveRoleIds]);

  const availableUsers = useMemo(() => {
    const memberIds = new Set(localMembers.map(m => m.userId));
    return allUsers.filter(u => !memberIds.has(u.id));
  }, [allUsers, localMembers]);

  const handleAddMember = () => {
    if (!selectedUserId) return;
    const userToAdd = allUsers.find(u => u.id === selectedUserId);
    if (!userToAdd) return;
    const developerRole = roles.find(r => r.projectRole === 'Developer');
    setLocalMembers(prev => [
      ...prev,
      { userId: userToAdd.id, user: userToAdd, roleIds: new Set(developerRole ? [String(developerRole.id)] : []) },
    ]);
    setSelectedUserId('');
    setSaveError('');
    setSaveSuccess('');
  };

  const handleRoleToggle = (userId, roleId) => {
    const id = String(roleId);
    setLocalMembers(prev => prev.map(m => {
      if (m.userId !== userId) return m;
      const newRoleIds = new Set(m.roleIds);
      if (newRoleIds.has(id)) {
        newRoleIds.delete(id);
      } else {
        if (exclusiveRoleIds.has(id) && takenExclusiveRoles.has(id) && takenExclusiveRoles.get(id) !== userId) {
          return m;
        }
        newRoleIds.add(id);
      }
      return { ...m, roleIds: newRoleIds };
    }));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleRemoveMember = (userId) => {
    setLocalMembers(prev => prev.filter(m => m.userId !== userId));
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSave = async () => {
    if (!project?.id) return;

    const trimmedName = localName.trim();
    if (!trimmedName) {
      setSaveError('Ime projekta je obvezno.');
      return;
    }

    const noRole = localMembers.find(m => m.roleIds.size === 0);
    if (noRole) {
      setSaveError(`Uporabnik "${noRole.user?.username}" nima dodeljene nobene vloge.`);
      return;
    }

    const poRole = roles.find(r => r.projectRole === 'Product Owner');
    const smRole = roles.find(r => r.projectRole === 'Scrum Master');
    const poCount = localMembers.filter(m => poRole && m.roleIds.has(String(poRole.id))).length;
    const smCount = localMembers.filter(m => smRole && m.roleIds.has(String(smRole.id))).length;

    if (poCount === 0) { setSaveError('Projekt mora imeti vsaj enega Produktnega vodjo.'); return; }
    if (smCount === 0) { setSaveError('Projekt mora imeti vsaj enega Skrbnika metodologije.'); return; }
    if (poCount > 1) { setSaveError('Projekt lahko ima samo enega Produktnega vodjo.'); return; }
    if (smCount > 1) { setSaveError('Projekt lahko ima samo enega Skrbnika metodologije.'); return; }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      if (trimmedName !== project.name) {
        await updateProjectName(project.id, trimmedName);
      }

      const desiredMembers = localMembers.map(m => ({
        userId: m.userId,
        roleIds: Array.from(m.roleIds).map(Number),
      }));
      await saveProjectMembers(project.id, desiredMembers);

      setSaveSuccess('Spremembe so bile shranjene.');
      if (onSaved) await onSaved();
    } catch (err) {
      setSaveError(err?.message || 'Napaka pri shranjevanju.');
    } finally {
      setSaving(false);
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

            {/* Project name */}
            <div className="project-settings-modal__section">
              <h3>Ime projekta</h3>
              <label className="project-settings-modal__field">
                <span>Ime</span>
                <input
                  type="text"
                  value={localName}
                  onChange={e => setLocalName(e.target.value)}
                  placeholder="Vnesite ime projekta"
                />
              </label>
            </div>

            {/* Add new member */}
            <div className="project-settings-modal__section">
              <h3>Dodaj člana</h3>
              <label className="project-settings-modal__field">
                <span>Uporabnik</span>
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                  <option value="">Izberi uporabnika</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username}{user.name ? ` (${user.name} ${user.surname ?? ''})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="project-settings-modal__actions">
                <button
                  type="button"
                  className="project-panel__button"
                  onClick={handleAddMember}
                  disabled={!selectedUserId}
                >
                  Dodaj člana
                </button>
              </div>
            </div>

            {/* Existing members */}
            <div className="project-settings-modal__section">
              <h3>Člani projekta</h3>
              {localMembers.length === 0 ? (
                <p className="project-settings-modal__message">V projektu še ni članov.</p>
              ) : (
                <div className="project-settings-modal__members">
                  {localMembers.map(({ userId, user, roleIds }) => (
                    <div key={userId} className="project-settings-modal__member">
                      <div className="project-settings-modal__member-info">
                        <strong>{user?.username || 'Neznan uporabnik'}</strong>
                        <span>{user?.name || ''} {user?.surname || ''}</span>
                      </div>
                      <div className="project-settings-modal__member-controls">
                        <div className="project-settings-modal__role-checkboxes">
                          {roles.map(role => {
                            const roleId = String(role.id);
                            const has = roleIds.has(roleId);
                            const takenBy = takenExclusiveRoles.get(roleId);
                            const takenByOther = !has && !!takenBy && takenBy !== userId;
                            const holder = takenByOther ? localMembers.find(m => m.userId === takenBy) : null;
                            return (
                              <label
                                key={role.id}
                                className="project-settings-modal__role-checkbox"
                                title={takenByOther ? `Že dodeljeno: ${holder?.user?.username ?? 'drug član'}` : undefined}
                              >
                                <input
                                  type="checkbox"
                                  checked={has}
                                  disabled={takenByOther}
                                  onChange={() => handleRoleToggle(userId, role.id)}
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
                        >
                          Odstrani
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="project-settings-modal__footer">
              <div className="project-settings-modal__footer-message">
                {saveError && (
                  <div className="project-settings-modal__alert project-settings-modal__alert--error">
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="project-settings-modal__alert project-settings-modal__alert--success">
                    {saveSuccess}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="project-panel__button project-settings-modal__save-button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Shranjevanje...' : 'Shrani spremembe'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectPageSettingsModalComponent;
