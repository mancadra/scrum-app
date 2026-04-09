import React, { useEffect, useMemo, useState } from 'react';
import { getUsers, getProjectRoles} from '../services/projects';
import './ProjectPageSettingsModalComponent.css';

const PROJECT_ROLE_LABELS = {
  'Product Owner': 'Produktni vodja',
  'Scrum Master': 'Skrbnik metodologije',
  Developer: 'Razvijalec',
};

const EXCLUSIVE_ROLES = ['Product Owner', 'Scrum Master'];

export default function ProjectPageSettingsModalComponent({ project, onClose, onSaved }) {
  const [allUsers, setAllUsers] = useState([]);
  const [projectRoles, setProjectRoles] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError('');

      try {
        const [users, roles, projectMemberships] = await Promise.all([
          getUsers(),
          getProjectRoles(),
          //TODO: manjka service getProjectMemberships(project.id),
        ]);

        if (cancelled) return;

        setAllUsers(users ?? []);
        setProjectRoles(roles ?? []);
        setMemberships(
          (projectMemberships ?? []).map((membership) => ({
            userId: membership.FK_userId,
            username: membership.Users?.username ?? '',
            name: membership.Users?.name ?? '',
            surname: membership.Users?.surname ?? '',
            roleIds: [membership.FK_projectRoleId],
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Napaka pri nalaganju nastavitev projekta.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const availableUsers = useMemo(() => {
    const usedIds = new Set(memberships.map((m) => m.userId));
    return allUsers.filter((user) => !usedIds.has(user.id));
  }, [allUsers, memberships]);

  const addUser = () => {
    if (!selectedUserId) return;

    const user = allUsers.find((u) => u.id === selectedUserId);
    if (!user) return;

    const developerRole = projectRoles.find((r) => r.projectRole === 'Developer');

    setMemberships((prev) => [
      ...prev,
      {
        userId: user.id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        roleIds: developerRole ? [developerRole.id] : [],
      },
    ]);

    setSelectedUserId('');
  };

  const toggleRole = (userId, roleId) => {
    setMemberships((prev) =>
      prev.map((member) => {
        if (member.userId !== userId) return member;

        const hasRole = member.roleIds.includes(roleId);
        return {
          ...member,
          roleIds: hasRole
            ? member.roleIds.filter((id) => id !== roleId)
            : [...member.roleIds, roleId],
        };
      })
    );
  };

  const removeUser = (userId) => {
    setMemberships((prev) => prev.filter((member) => member.userId !== userId));
  };

  const saveChanges = async () => {
    const userWithoutRoles = memberships.find((member) => member.roleIds.length === 0);
    if (userWithoutRoles) {
      setError(`Uporabnik "${userWithoutRoles.username}" nima dodeljene nobene vloge.`);
      return;
    }

    const payload = memberships.map((member) => ({
      userId: member.userId,
      roleIds: member.roleIds,
    }));

    setSaving(true);
    setError('');

/*    try {
      await //TODO: Manjka serviceupdateProjectMemberships(project.id, payload);
      if (onSaved) await onSaved();
    } catch (err) {
      setError(err.message || 'Napaka pri shranjevanju.');
    } finally {
      setSaving(false);
    }*/
  };

  return (
    <div className="project-settings-modal__overlay" onClick={onClose}>
      <div className="project-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="project-settings-modal__header">
          <h2>Nastavitve projekta</h2>
          <button type="button" className="project-settings-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="project-settings-modal__empty">Nalaganje...</div>
        ) : (
          <>
            {error && <div className="project-settings-modal__error">{error}</div>}

            <div className="project-settings-modal__add-row">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="project-settings-modal__select"
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
                className="project-panel__button"
                onClick={addUser}
                disabled={!selectedUserId}
              >
                Dodaj uporabnika
              </button>
            </div>

            <div className="project-settings-modal__list">
              {memberships.length === 0 ? (
                <div className="project-settings-modal__empty">Ni dodanih uporabnikov.</div>
              ) : (
                memberships.map((member) => (
                  <div key={member.userId} className="project-settings-modal__row">
                    <div className="project-settings-modal__user">
                      <strong>{member.username}</strong>
                      {member.name ? ` (${member.name} ${member.surname ?? ''})` : ''}
                    </div>

                    <div className="project-settings-modal__roles">
                      {projectRoles.map((role) => {
                        const isExclusive = EXCLUSIVE_ROLES.includes(role.projectRole);
                        const takenByOther =
                          isExclusive &&
                          !member.roleIds.includes(role.id) &&
                          memberships.some(
                            (m) => m.userId !== member.userId && m.roleIds.includes(role.id)
                          );

                        return (
                          <label
                            key={role.id}
                            className={`project-settings-modal__role${takenByOther ? ' disabled' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={member.roleIds.includes(role.id)}
                              onChange={() => toggleRole(member.userId, role.id)}
                              disabled={takenByOther}
                            />
                            {PROJECT_ROLE_LABELS[role.projectRole] ?? role.projectRole}
                          </label>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      className="project-settings-modal__remove"
                      onClick={() => removeUser(member.userId)}
                    >
                      Odstrani
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="project-settings-modal__footer">
              <button
                type="button"
                className="project-panel__button"
                onClick={saveChanges}
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
}