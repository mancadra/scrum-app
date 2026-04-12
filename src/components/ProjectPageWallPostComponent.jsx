import React from 'react';

const getAuthorLabel = (post) => {
  const user = post.Users;
  if (!user) return 'Neznani uporabnik';

  const fullName = [user.name, user.surname].filter(Boolean).join(' ').trim();
  return fullName || user.username || 'Neznani uporabnik';
};

const ProjectPageWallPostComponent = ({ post, onClick }) => {
  const preview = (post.content ?? '').trim();

  return (
    <button
      type="button"
      className="project-wall-post-card"
      onClick={() => onClick(post)}
    >
      <div className="project-wall-post-card__header">
        <strong className="project-wall-post-card__author">{getAuthorLabel(post)}</strong>
        <span className="project-wall-post-card__date">
          {post.created_at ? new Date(post.created_at).toLocaleString() : ''}
        </span>
      </div>

      <div className="project-wall-post-card__content">
        {preview.length > 180 ? `${preview.slice(0, 180)}…` : preview}
      </div>
    </button>
  );
};

export default ProjectPageWallPostComponent;