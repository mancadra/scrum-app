import React, { useEffect, useState } from 'react';
import ProjectPageWallPostComponent from './ProjectPageWallPostComponent';
import { createWallPost, getWallPosts } from '../services/wallPosts';
import './ProjectPageWallComponent.css';

const getAuthorLabel = (post) => {
    const user = post.Users;
    if (!user) return 'Neznani uporabnik';

    const fullName = [user.name, user.surname].filter(Boolean).join(' ').trim();
    return fullName || user.username || 'Neznani uporabnik';
};

const ProjectPageWallComponent = ({ project }) => {
    const [posts, setPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function loadPosts() {
            if (!project?.id) {
                setPosts([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const data = await getWallPosts(project.id);
                if (!cancelled) setPosts(data ?? []);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Napaka pri nalaganju objav.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadPosts();

        return () => {
            cancelled = true;
        };
    }, [project?.id]);

    const refreshPosts = async () => {
        const data = await getWallPosts(project.id);
        setPosts(data ?? []);
    };

    const handleCreatePost = async () => {
        if (!content.trim()) {
            setError('Vsebina objave ne sme biti prazna.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await createWallPost(project.id, content);
            setContent('');
            setShowCreateModal(false);
            await refreshPosts();
        } catch (err) {
            setError(err.message || 'Napaka pri ustvarjanju objave.');
        } finally {
            setSaving(false);
        }
    };

    if (!project) {
        return <div className="project-wall">Ni izbranega projekta.</div>;
    }

    return (
        <div className="project-wall">
            <div className="project-wall__header">
                <h2 className="project-wall__title">ZID</h2>
                <div className="project-wall__actions">
                    <button
                        type="button"
                        className="project-panel__button project-wall__add-button"
                        onClick={() => setShowCreateModal(true)}
                    >
                        DODAJ OBJAVO
                    </button>
                </div>
                {error && <div className="project-wall__error">{error}</div>}
            </div>

            {loading ? (
                <div className="project-wall__empty">Nalaganje objav...</div>
            ) : posts.length === 0 ? (
                <div className="project-wall__empty">Ni še nobenih objav.</div>
            ) : (
                <div className="project-wall__grid">
                    {posts.map((post) => (
                        <ProjectPageWallPostComponent
                            key={post.id}
                            post={post}
                            onClick={setSelectedPost}
                        />
                    ))}
                </div>
            )}

        {selectedPost && (
            <div className="story-modal-overlay" onClick={() => setSelectedPost(null)}>
                <div className="story-modal project-wall-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="project-wall-modal__header">
                        <h2 className="project-wall-modal__title">Podrobnosti objave</h2>
                        <button
                            type="button"
                            className="project-wall-modal__close"
                            onClick={() => setSelectedPost(null)}
                            aria-label="Zapri"
                        >
                            ×
                        </button>
                    </div>

                    <div className="project-wall-modal__body">
                        <p className="project-wall-modal__meta">
                            <strong>Avtor:</strong> {getAuthorLabel(selectedPost)}
                        </p>
                        <p className="project-wall-modal__meta">
                            <strong>Datum:</strong>{' '}
                            {selectedPost.created_at ? new Date(selectedPost.created_at).toLocaleString() : '—'}
                        </p>
                        <div className="project-wall-modal__content">
                            {selectedPost.content}
                        </div>
                    </div>
                </div>
            </div>
      )}

      {showCreateModal && (
        <div className="story-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="story-modal project-wall-modal" onClick={(e) => e.stopPropagation()}>
            <div className="story-modal__header project-wall-modal__header">
              <h2>Dodaj objavo</h2>
              <button
                type="button"
                className="project-wall-modal__close"
                onClick={() => setShowCreateModal(false)}
                aria-label="Zapri"
              >
                ×
              </button>
            </div>

            <div className="story-modal__content project-wall-modal__content-panel">
              <label className="project-wall-modal__field">
                <span>Besedilo objave</span>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="Napiši objavo..."
                />
              </label>

              <div className="story-modal__actions">
                <button
                  type="button"
                  className="project-panel__button"
                  onClick={handleCreatePost}
                  disabled={saving}
                >
                  {saving ? 'Shranjevanje…' : 'Objavi'}
                </button>

                <button
                  type="button"
                  className="story-modal__secondary-button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Prekliči
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
    );
};

export default ProjectPageWallComponent;