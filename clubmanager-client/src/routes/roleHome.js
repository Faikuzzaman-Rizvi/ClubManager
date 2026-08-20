/** Where each role lands after signing in, and where its navbar "home" points. */
export function homePathForRole(role) {
  switch (role) {
    case 'Admin':
      return '/admin';
    case 'Coach':
      return '/coach';
    case 'Player':
      return '/player';
    default:
      return '/standings';
  }
}
