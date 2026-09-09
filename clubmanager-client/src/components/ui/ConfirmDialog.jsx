import { useEffect, useRef } from 'react';
import Icon from './Icon';

/**
 * Confirmation for destructive actions, replacing window.confirm.
 *
 * Focus moves to the confirm button on open and returns to whatever opened the
 * dialog on close, Escape cancels, and the backdrop is click-to-dismiss - none
 * of which the native dialog gives us, and all of which a keyboard user needs.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;
    confirmRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // The trigger may have unmounted with the row it belonged to.
      if (restoreRef.current?.isConnected) restoreRef.current.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="modal-head">
          <span className="modal-icon modal-icon-danger" aria-hidden="true">
            <Icon name="alert" size={20} />
          </span>
          <h2 id="confirm-title">{title}</h2>
        </div>
        <p className="modal-body">{message}</p>

        <div className="modal-actions">
          <button type="button" className="btn-secondary btn-small" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className="btn-primary btn-small btn-danger-solid"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
