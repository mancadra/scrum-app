import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { getStoryComments, addStoryComment } from '../services/stories';
import './BacklogStoryDetailsComponent.css';

const BacklogStoryDetailsComponent = ({ story, onClose, getAcceptanceTests, getStoryPriority, projectId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [canComment, setCanComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (!story?.id) return;

    getStoryComments(story.id)
      .then(setComments)
      .catch(() => setComments([]));
  }, [story?.id]);

  useEffect(() => {
    if (!projectId) return;

    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('ProjectUsers')
        .select('ProjectRoles(projectRole)')
        .eq('FK_projectId', projectId)
        .eq('FK_userId', user.id)
        .maybeSingle();

      setCanComment(membership?.ProjectRoles?.projectRole === 'Developer');
    };

    checkRole();
  }, [projectId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError('');
    setSubmitting(true);
    try {
      const comment = await addStoryComment(story.id, newComment);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!story) {
    return null;
  }

  const acceptanceTests = getAcceptanceTests?.(story) ?? [];

  const formatCommentUser = (user) => {
    if (!user) return 'Neznan';
    return user.name && user.surname ? `${user.name} ${user.surname}` : user.username;
  };

  return (
    <div className="backlog-story-details__overlay" onClick={() => onClose?.()}>
      <div
        className="backlog-story-details"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backlog-story-details-title"
      >
        <div className="backlog-story-details__header">
          <div>
            <p className="backlog-story-details__eyebrow">Podrobnosti zgodbe</p>
            <h2 id="backlog-story-details-title">{story.name}</h2>
          </div>

          <button
            type="button"
            className="backlog-story-details__close"
            onClick={() => onClose?.()}
            aria-label="Zapri podrobnosti zgodbe"
          >
            ✕
          </button>
        </div>

        <div className="backlog-story-details__content">
          <section className="backlog-story-details__section">
            <h3></h3>
            <div className="backlog-story-details__grid">
              <div>
                <span className="backlog-story-details__label">Opis</span>
                <p>{story.description || '—'}</p>
              </div>

              <div>
                <span className="backlog-story-details__label">Prioriteta</span>
                <p>{getStoryPriority?.(story) ?? '—'}</p>
              </div>

              <div>
                <span className="backlog-story-details__label">Poslovna vrednost</span>
                <p>{story.businessValue ?? '—'}</p>
              </div>

              <div>
                <span className="backlog-story-details__label">Status</span>
                <p>
                  {story.realized
                    ? 'Realizirana'
                    : story.sprintId
                      ? 'Dodeljena'
                      : 'Nedodeljena'}
                </p>
              </div>

              <div>
                <span className="backlog-story-details__label">Časovna zahtevnost</span>
                <p>{story.timeComplexity != null && story.timeComplexity !== '' ? story.timeComplexity : '—'}</p>
              </div>

              <div>
                <span className="backlog-story-details__label">Sprint</span>
                <p>{story.sprintId ?? '—'}</p>
              </div>
            </div>
          </section>

          <section className="backlog-story-details__section">
            <h3>Sprejemni testi</h3>
            {acceptanceTests.length > 0 ? (
              <ul className="backlog-story-details__list">
                {acceptanceTests.map((test, index) => (
                  <li key={`${test}-${index}`}>{test}</li>
                ))}
              </ul>
            ) : (
              <p>Ni testov.</p>
            )}
          </section>

          <section className="backlog-story-details__section">
            <h3>Opombe</h3>

            {comments.length > 0 ? (
              <ul className="story-comments__list">
                {comments.map(c => (
                  <li key={c.id} className="story-comments__item">
                    <div className="story-comments__meta">
                      <span className="story-comments__author">{formatCommentUser(c.user)}</span>
                      <span className="story-comments__date">
                        {new Date(c.createdAt).toLocaleString('sl-SI')}
                      </span>
                    </div>
                    <p className="story-comments__content">{c.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Ni opomb.</p>
            )}

            {canComment && (
              <form className="story-comments__form" onSubmit={handleAddComment}>
                <textarea
                  className="story-comments__textarea"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Dodajte opombo..."
                  rows={3}
                  disabled={submitting}
                />
                {commentError && <p className="story-comments__error">{commentError}</p>}
                <button
                  type="submit"
                  className="story-comments__submit"
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? 'Shranjevanje…' : 'Dodaj opombo'}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default BacklogStoryDetailsComponent;
