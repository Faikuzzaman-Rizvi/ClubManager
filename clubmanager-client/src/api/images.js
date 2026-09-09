import axiosClient from './axiosClient';

/*
 * The API stores site-relative paths ("/uploads/players/….webp") because that is
 * what belongs in a database - it survives a change of host. The browser, though,
 * resolves a relative src against the page origin, which in development is Vite
 * on :5173 rather than the API on :5075. Every image src therefore goes through
 * resolveImageUrl.
 */
const apiOrigin = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5075';

/** Absolute URL for an image path from the API, or null when there is no image. */
export function resolveImageUrl(url) {
  if (!url) return null;

  // Already absolute, or a local object/data URL from a preview.
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  return `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/*
 * Mirrors what ImageStorage accepts server-side. Checking here too is a courtesy,
 * not a control: it turns "picked the wrong file" into instant feedback instead of
 * a round trip. The server re-validates everything regardless, and it is the
 * server's answer that decides.
 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Returns a message when the file is obviously unusable, or null when it may be sent. */
export function validateImageFile(file) {
  if (!file) return 'No file selected.';

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG and WebP images are accepted.';
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0);
    return `The image must be ${mb} MB or smaller.`;
  }

  return null;
}

/** The three image endpoints, so no page has to spell a path out. */
export const imageEndpoints = {
  playerImage: (playerId) => `/api/players/${playerId}/image`,
  teamLogo: (teamId) => `/api/teams/${teamId}/logo`,
  ownAvatar: () => '/api/users/me/avatar',
};

/**
 * Uploads one image and resolves to the stored URL.
 *
 * Content-Type is explicitly cleared: axiosClient sets application/json for the
 * whole instance, and that would override the multipart boundary the browser
 * needs to generate for FormData.
 */
export async function uploadImage(path, file, onProgress) {
  const form = new FormData();
  form.append('file', file);

  const response = await axiosClient.post(path, form, {
    headers: { 'Content-Type': undefined },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return response.data?.imageUrl ?? null;
}

/**
 * Removes an image. Resolves to whatever the entity should show now - usually
 * null, but clearing a Player's own avatar reveals their player photo instead.
 */
export async function removeImage(path) {
  const response = await axiosClient.delete(path);
  return response.data?.imageUrl ?? null;
}
