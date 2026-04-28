import React from 'react';
import { useField } from 'payload/components/forms';

/**
 * Custom field component for `videoWalkthrough.externalUrl`.
 *
 * Written with React.createElement (no JSX) so this file can be compiled
 * by ts-node-dev without a jsx tsconfig option. Payload's webpack bundler
 * handles it correctly for the admin UI.
 *
 * Shows a URL text input + a live iframe embed for YouTube / Vimeo URLs.
 */

function toEmbedUrl(raw: string): string | null {
  if (!raw) return null;
  const yt = raw.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`;
  const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  fontWeight: 600,
  fontSize: '0.85rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--theme-elevation-150, #ddd)',
  borderRadius: '4px',
  fontSize: '0.95rem',
  background: 'var(--theme-input-bg, #fff)',
  color: 'var(--theme-text, #000)',
  boxSizing: 'border-box',
};

const hintStyle: React.CSSProperties = {
  marginTop: '0.25rem',
  fontSize: '0.8rem',
  color: 'var(--theme-elevation-500, #666)',
};

const previewLabelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.4rem',
  color: 'var(--theme-elevation-500, #666)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const iframeStyle: React.CSSProperties = {
  borderRadius: '6px',
  display: 'block',
  border: 'none',
};

const VideoUrlField: React.FC<{ path: string; label?: string }> = ({
  path,
  label = 'External URL',
}) => {
  const { value, setValue } = useField<string>({ path });
  const embedUrl = toEmbedUrl(value ?? '');

  return React.createElement(
    'div',
    { style: { marginBottom: '1rem' } },

    // Label
    React.createElement('label', { htmlFor: path, style: labelStyle }, label),

    // Input
    React.createElement('input', {
      id: path,
      type: 'url',
      value: value ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
      placeholder: 'https://www.youtube.com/watch?v=...',
      style: inputStyle,
    }),

    // Hint
    React.createElement('p', { style: hintStyle }, 'Supports YouTube and Vimeo URLs.'),

    // Embed preview (YouTube / Vimeo)
    embedUrl
      ? React.createElement(
          'div',
          { style: { marginTop: '0.75rem' } },
          React.createElement('p', { style: previewLabelStyle }, 'Preview'),
          React.createElement('iframe', {
            src: embedUrl,
            width: '100%',
            height: 360,
            style: iframeStyle,
            allow:
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowFullScreen: true,
            title: 'Video preview',
          }),
        )
      : value
        ? React.createElement(
            'p',
            { style: { ...hintStyle, color: '#999', marginTop: '0.5rem' } },
            'Preview only available for YouTube and Vimeo links.',
          )
        : null,
  );
};

export default VideoUrlField;
