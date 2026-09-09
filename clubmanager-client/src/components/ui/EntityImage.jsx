import { useState } from 'react';
import { resolveImageUrl } from '../../api/images';

/**
 * Initials for the fallback. Two letters from a name, one from a single word.
 */
function initialsFor(name) {
  const parts = String(name ?? '')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A stable hue per name, so a squad of fallbacks reads as a set of distinct
 * people rather than a column of identical grey circles. Deterministic, so the
 * same player keeps the same colour across pages and reloads.
 */
function hueFor(name) {
  const text = String(name ?? '');
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 360;
  }

  return hash;
}

/**
 * One image with a guaranteed fallback - the only way an entity picture should
 * ever be rendered.
 *
 * A missing URL, a deleted file, a network failure and a broken response all end
 * up in the same place: initials on a tinted ground. There is no code path that
 * leaves a broken-image icon on screen.
 *
 * Variants are shapes, not sizes: `avatar` is a circle for people, `logo` a
 * rounded square for crests, `cover` a filling rectangle for cards. Size comes
 * from CSS so a caller can scale one with a class.
 */
export default function EntityImage({
  src,
  name,
  variant = 'avatar',
  className = '',
  alt,
  eager = false,
}) {
  const resolved = resolveImageUrl(src);

  // Remembering WHICH url failed, rather than a plain "failed" flag, is what
  // gives a replacement image a fresh attempt: a new src is by definition not
  // the one that broke, so there is nothing to reset.
  const [failedSrc, setFailedSrc] = useState(null);

  const showImage = Boolean(resolved) && failedSrc !== resolved;
  const classes = `entity-image entity-image-${variant} ${className}`.trim();

  if (!showImage) {
    return (
      <span
        className={`${classes} is-fallback`}
        style={{ '--fallback-hue': hueFor(name) }}
        // The name is already rendered as text beside every one of these, so
        // announcing the initials again would just be noise.
        aria-hidden="true"
      >
        {initialsFor(name)}
      </span>
    );
  }

  return (
    <img
      className={classes}
      src={resolved}
      alt={alt ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable="false"
      onError={() => setFailedSrc(resolved)}
    />
  );
}
