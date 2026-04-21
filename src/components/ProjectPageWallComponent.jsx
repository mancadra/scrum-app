import React, { useEffect, useState } from 'react';
import ProjectPageWallPostComponent from './ProjectPageWallPostComponent';
import {
    createWallComment,
    createWallPost,
    deleteWallComment,
    deleteWallPost,
    getCommentsForPost,
    getWallPosts,
} from '../services/wallPosts';
import { getCurrentUser } from '../services/auth';
import { getProjectRolesForUser } from '../services/tasks';
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
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [content, setContent] = useState('');
    const [commentContent, setCommentContent] = useState('');
    const [savingComment, setSavingComment] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [canDelete, setCanDelete] = useState(false);

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
                const [data, currentUser] = await Promise.all([
                    getWallPosts(project.id),
                    getCurrentUser(),
                ]);

                if (!cancelled) {
                    setPosts(data ?? []);

                    const isAdmin = currentUser?.profile?.UserRoles?.some(r => r.Roles?.name === 'Admin') ?? false;
                    const roles = await getProjectRolesForUser(project.id, currentUser?.id);
                    setCanDelete(isAdmin || roles.includes('Scrum Master'));
                }
            } catch (err) {
                if (!cancelled) setError(err.message || 'Napaka pri nalaganju objav.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadPosts();
        return () => { cancelled = true; };
    }, [project?.id]);

    const refreshPosts = async () => {
        const data = await getWallPosts(project.id);
        setPosts(data ?? []);
    };

    const handleOpenPost = async (post) => {
        setSelectedPost(post);
        setCommentContent('');
        setLoadingComments(true);
        try {
            const data = await getCommentsForPost(post.id);
            setComments(data);
        } catch {
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async () => {
        if (!commentContent.trim() || !selectedPost) return;
        setSavingComment(true);
        try {
            const newComment = await createWallComment(selectedPost.id, commentContent);
            setComments(prev => [...prev, newComment]);
            setCommentContent('');
        } catch (err) {
            setError(err.message || 'Napaka pri dodajanju komentarja.');
        } finally {
            setSavingComment(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Ali res želite izbrisati to objavo in vse njene komentarje?')) return;
        try {
            await deleteWallPost(postId);
            setSelectedPost(null);
            await refreshPosts();
        } catch (err) {
            setError(err.message || 'Napaka pri brisanju objave.');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Ali res želite izbrisati ta komentar?')) return;
        try {
            await deleteWallComment(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err) {
            setError(err.message || 'Napaka pri brisanju komentarja.');
        }
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
                            onClick={handleOpenPost}
                            canDelete={canDelete}
                            onDelete={handleDeletePost}
                        />
                    ))}
                </div>
            )}

            {/* Post detail modal */}
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

                            {/* Comments */}
                            <div className="project-wall-modal__comments">
                                <h3 className="project-wall-modal__comments-title">Komentarji</h3>
                                {loadingComments ? (
                                    <p className="project-wall-modal__comments-empty">Nalaganje...</p>
                                ) : comments.length === 0 ? (
                                    <p className="project-wall-modal__comments-empty">Ni komentarjev.</p>
                                ) : (
                                    comments.map(comment => (
                                        <div key={comment.id} className="project-wall-modal__comment">
                                            <div className="project-wall-modal__comment-header">
                                                <span className="project-wall-modal__comment-author">
                                                    {getAuthorLabel(comment)}
                                                </span>
                                                <span className="project-wall-modal__comment-date">
                                                    {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                                                </span>
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        className="project-wall-modal__comment-delete"
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        title="Izbriši komentar"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                            <div className="project-wall-modal__comment-content">
                                                {comment.content}
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* Add comment form */}
                                <div className="project-wall-modal__comment-form">
                                    <textarea
                                        className="project-wall-modal__comment-input"
                                        value={commentContent}
                                        onChange={e => setCommentContent(e.target.value)}
                                        placeholder="Dodaj komentar..."
                                        rows={2}
                                    />
                                    <button
                                        type="button"
                                        className="project-panel__button project-wall-modal__comment-submit"
                                        onClick={handleAddComment}
                                        disabled={savingComment || !commentContent.trim()}
                                    >
                                        {savingComment ? 'Pošiljam...' : 'Komentiraj'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create post modal */}
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
