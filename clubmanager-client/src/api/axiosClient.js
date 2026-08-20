import axios from 'axios';

export const TOKEN_KEY = 'cm_token';
export const USER_KEY = 'cm_user';

// Vite inlines this at build time; the fallback keeps `npm run dev` working
// against a local API with no .env present.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5075';

const axiosClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

/*
 * A 401 from the login call means "wrong password" and belongs to the form, not
 * to the session. Redirecting on it would wipe the page the user is typing into.
 */
const SESSION_EXEMPT_PATHS = ['/api/auth/login'];

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isSessionExempt = SESSION_EXEMPT_PATHS.some((path) => url.includes(path));

    if (status === 401 && !isSessionExempt) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);

      // Full assign rather than router navigation: the interceptor lives outside
      // the React tree. Guarded so a 401 on /login cannot loop.
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
