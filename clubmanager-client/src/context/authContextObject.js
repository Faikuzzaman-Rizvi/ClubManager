import { createContext } from 'react';

/**
 * The context object on its own, with no component in the module, so both
 * AuthProvider and useAuth can import it without either file mixing component
 * and non-component exports.
 */
export const AuthContext = createContext(null);
