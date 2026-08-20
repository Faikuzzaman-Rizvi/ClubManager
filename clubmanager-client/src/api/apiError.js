/**
 * Turns an axios error into a message worth showing a user.
 *
 * The API answers with two different ProblemDetails shapes:
 *   - model validation (short name, missing field) -> { errors: { Field: [msg] } }, no `detail`
 *   - service rules (409 delete blocked, 404 missing) -> { detail: "..." }
 * Reading only `detail` would render "undefined" for the first kind.
 */
export function apiErrorMessage(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data;

  if (!data) {
    return error?.message ?? fallback;
  }

  if (data.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  return data.detail ?? data.title ?? fallback;
}
