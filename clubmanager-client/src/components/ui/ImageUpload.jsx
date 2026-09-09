import { useEffect, useId, useRef, useState } from 'react';
import EntityImage from './EntityImage';
import {
  ACCEPT_ATTRIBUTE,
  removeImage,
  uploadImage,
  validateImageFile,
} from '../../api/images';
import { apiErrorMessage } from '../../api/apiError';

/**
 * The one way an image is managed anywhere in the app: player photo, club crest
 * and user avatar all mount this.
 *
 * Click or drop a file and it uploads immediately, showing a local preview while
 * the request is in flight so the picture appears the moment it is chosen rather
 * than when the network catches up. A failed upload rolls the preview back to
 * whatever was there before, so the UI never claims a change that did not happen.
 *
 * `endpoint` decides what is being changed, which is why the same component
 * serves all three: the caller owns the URL, and gets the stored path back
 * through `onChange` to fold into its own state.
 */
export default function ImageUpload({
  endpoint,
  value,
  name,
  label,
  variant = 'avatar',
  helpText,
  disabled = false,
  /* Defaults to "there is a picture", which is right everywhere except an
     inherited one - see the Player profile, where the squad photo shows
     through and there is nothing of the account's own to remove. */
  canRemove,
  onChange,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const previewRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Object URLs are a manual allocation; without this every pick leaks one.
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreview(null);
  }

  async function handleFile(file) {
    setError(null);
    setDone(false);

    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    clearPreview();
    const objectUrl = URL.createObjectURL(file);
    previewRef.current = objectUrl;
    setPreview(objectUrl);

    setBusy(true);
    setProgress(0);

    try {
      const storedUrl = await uploadImage(endpoint, file, setProgress);
      onChange?.(storedUrl, { removed: false });
      setDone(true);
    } catch (failure) {
      setError(apiErrorMessage(failure, 'That image could not be uploaded.'));
    } finally {
      // Either way the server's answer is now the source of truth, so the local
      // preview steps aside rather than masking what was really stored.
      clearPreview();
      setBusy(false);
      setProgress(null);
    }
  }

  async function handleRemove() {
    setError(null);
    setDone(false);
    setBusy(true);

    try {
      const remaining = await removeImage(endpoint);
      onChange?.(remaining, { removed: true });
    } catch (failure) {
      setError(apiErrorMessage(failure, 'That image could not be removed.'));
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);

    if (disabled || busy) return;

    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  function openPicker() {
    if (!disabled && !busy) inputRef.current?.click();
  }

  const shown = preview ?? value;

  return (
    <div className={`image-upload image-upload-${variant}`}>
      {label && (
        <span className="image-upload-label" id={`${inputId}-label`}>
          {label}
        </span>
      )}

      {/*
        A button, not a div with a click handler: it has to be reachable and
        operable from the keyboard, and the file input itself is visually hidden.
      */}
      <button
        type="button"
        className={`image-upload-drop${dragging ? ' is-dragging' : ''}${busy ? ' is-busy' : ''}`}
        onClick={openPicker}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        disabled={disabled || busy}
        aria-labelledby={label ? `${inputId}-label` : undefined}
        aria-label={label ? undefined : 'Upload an image'}
      >
        <EntityImage src={shown} name={name} variant={variant} eager />

        <span className="image-upload-hint" aria-hidden="true">
          {busy ? 'Uploading…' : shown ? 'Change' : 'Upload'}
        </span>

        {busy && progress != null && (
          <span className="image-upload-progress" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="image-upload-input"
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          // Reset so picking the same file twice still fires a change.
          event.target.value = '';
        }}
      />

      <div className="image-upload-actions">
        <button type="button" className="btn-link" onClick={openPicker} disabled={disabled || busy}>
          {shown ? 'Change photo' : 'Upload photo'}
        </button>

        {(canRemove ?? Boolean(value)) && (
          <button
            type="button"
            className="btn-link btn-link-danger"
            onClick={handleRemove}
            disabled={disabled || busy}
          >
            Remove
          </button>
        )}
      </div>

      {/* One live region for all three outcomes, so a screen reader hears the
          result of an upload without the message order mattering. */}
      <p className="image-upload-status" role="status" aria-live="polite">
        {error ? (
          <span className="image-upload-error">{error}</span>
        ) : done ? (
          <span className="image-upload-done">Image saved.</span>
        ) : (
          <span className="image-upload-help">
            {helpText ?? 'JPG, PNG or WebP, up to 5 MB. Drag a file here or click to browse.'}
          </span>
        )}
      </p>
    </div>
  );
}
