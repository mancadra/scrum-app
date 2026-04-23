import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    createDocumentation,
    getDocumentation,
    saveDocumentation,
    importDocumentation,
} from '../services/documentation';
import './ProjectPageDocumentationComponent.css';

const escapeHtml = (value) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const renderMarkdown = (markdown) => {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let i = 0;

    const parseInline = (text) => {
        let out = escapeHtml(text);
        out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
        out = out.replace(/`(.+?)`/g, '<code>$1</code>');
        return out;
    };

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) {
            i += 1;
            continue;
        }

        if (line.startsWith('```')) {
            i += 1;
            const codeLines = [];
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i += 1;
            }
            if (i < lines.length) i += 1;
            blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
            continue;
        }

        if (line.startsWith('# ')) {
            blocks.push(`<h1>${parseInline(line.slice(2))}</h1>`);
            i += 1;
            continue;
        }

        if (line.startsWith('## ')) {
            blocks.push(`<h2>${parseInline(line.slice(3))}</h2>`);
            i += 1;
            continue;
        }

        if (line.startsWith('### ')) {
            blocks.push(`<h3>${parseInline(line.slice(4))}</h3>`);
            i += 1;
            continue;
        }

        if (/^\s*-\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
                items.push(`<li>${parseInline(lines[i].replace(/^\s*-\s+/, ''))}</li>`);
                i += 1;
            }
            blocks.push(`<ul>${items.join('')}</ul>`);
            continue;
        }

        const paragraphLines = [line];
        i += 1;
        while (
            i < lines.length &&
            lines[i].trim() &&
            !lines[i].startsWith('# ') &&
            !lines[i].startsWith('## ') &&
            !lines[i].startsWith('### ') &&
            !lines[i].startsWith('```') &&
            !/^\s*-\s+/.test(lines[i])
            ) {
            paragraphLines.push(lines[i]);
            i += 1;
        }

        blocks.push(`<p>${parseInline(paragraphLines.join(' '))}</p>`);
    }

    return blocks.join('');
};

const ProjectapageDocumentationComponent = ({ project, onBackToProject }) => {
    const [documentation, setDocumentation] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [draftDocumentation, setDraftDocumentation] = useState('');
    const [hasDocumentation, setHasDocumentation] = useState(true);
    const fileInputRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        async function loadDocumentation() {
            if (!project?.id) return;

            setLoading(true);
            setError('');
            setIsEditing(false);

            try {
                const doc = await getDocumentation(project.id);
                const content = doc?.content ?? '';

                if (!cancelled) {
                    setDocumentation(content);
                    setDraftDocumentation(content);
                    setHasDocumentation(!!doc);
                }
            } catch (err) {
                if (!cancelled) setError(err.message || 'Napaka pri nalaganju dokumentacije.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadDocumentation();

        return () => {
            cancelled = true;
        };
    }, [project?.id]);

    const renderedMarkdown = useMemo(
        () => renderMarkdown(documentation || 'Ni dokumentacije za prikaz.'),
        [documentation]
    );

    const handleCreateDocumentation = async () => {
        if (!project?.id) return;

        setSaving(true);
        setError('');

        try {
            const created = await createDocumentation(project.id);
            const content = created?.content ?? '';
            setDocumentation(content);
            setDraftDocumentation(content);
            setHasDocumentation(true);
            setIsEditing(true);
        } catch (err) {
            setError(err.message || 'Napaka pri ustvarjanju dokumentacije.');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = () => {
        setDraftDocumentation(documentation);
        setIsEditing(true);
        setError('');
    };

    const handleDownload = () => {
        const textContent = documentation || '';
        if (!textContent.trim()) {
            setError('Ni dokumentacije za prenos.');
            return;
        }

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `documentation-${project.id}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleUploadClick = () => {
        setError('');
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.txt')) {
            setError('Prosimo, naloži .txt datoteko.');
            return;
        }

        try {
            setSaving(true);
            setError('');

            const fileContent = await file.text();
            const saved = await importDocumentation(project.id, fileContent);
            const content = saved?.content ?? fileContent;

            setDocumentation(content);
            setDraftDocumentation(content);
            setHasDocumentation(true);
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Napaka pri nalaganju dokumentacije.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setDraftDocumentation(documentation);
        setIsEditing(false);
        setError('');
    };

    const handleSave = async () => {
        if (!project?.id) return;

        setSaving(true);
        setError('');

        try {
            const saved = await saveDocumentation(project.id, draftDocumentation);
            const content = saved?.content ?? draftDocumentation;
            setDocumentation(content);
            setDraftDocumentation(content);
            setHasDocumentation(true);
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Napaka pri shranjevanju dokumentacije.');
        } finally {
            setSaving(false);
        }
    };

    if (!project) {
        return <div className="project-page">Ni izbranega projekta.</div>;
    }

    return (
        <div className="project-page">
            <div className="project-panel project-page__documentation-panel">
                <div className="project-panel__header project-page__documentation-header">
                    <h2>DOKUMENTACIJA PROJEKTA</h2>

                    {!loading && !isEditing && !error && (
                        <div className="project-page__documentation-header-actions">
                            {hasDocumentation ? (
                                <>
                                    <button
                                        type="button"
                                        className="project-panel__button"
                                        onClick={handleEdit}
                                    >
                                        Uredi
                                    </button>

                                    <button
                                        type="button"
                                        className="story-modal__secondary-button"
                                        onClick={handleDownload}
                                    >
                                        Prenesi
                                    </button>

                                    <button
                                        type="button"
                                        className="story-modal__secondary-button"
                                        onClick={handleUploadClick}
                                        disabled={saving}
                                    >
                                        Naloži
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="project-panel__button"
                                    onClick={handleCreateDocumentation}
                                    disabled={saving}
                                >
                                    {saving ? 'Ustvarjanje…' : 'USTVARI DOKUMENTACIJO'}
                                </button>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,text/plain"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    )}
                </div>

                <div className="project-page__documentation-scroll">
                    {loading ? (
                        <p>Nalaganje dokumentacije…</p>
                    ) : error ? (
                        <p className="project-page__documentation-error">{error}</p>
                    ) : isEditing ? (
                        <div className="project-page__documentation-editor">
              <textarea
                  className="project-page__documentation-textarea"
                  value={draftDocumentation}
                  onChange={(e) => setDraftDocumentation(e.target.value)}
                  rows={18}
                  spellCheck={false}
              />

                            <div className="project-page__documentation-actions">
                                <button
                                    type="button"
                                    className="project-panel__button"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Shranjevanje…' : 'Shrani'}
                                </button>

                                <button
                                    type="button"
                                    className="story-modal__secondary-button"
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    Prekliči
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="project-page__documentation-content"
                            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectapageDocumentationComponent;