
export const getStoredUsername = (): string => {
  return localStorage.getItem(AUTH_STORAGE_KEYS.username) ?? '';
};

export const AUTH_STORAGE_KEYS = {
  username: 'qc-vision:username',
  loggedIn: 'qc-vision:logged-in',
  role: 'qc-vision:role',
} as const;

export const getStoredRole = (): string => {
  return localStorage.getItem(AUTH_STORAGE_KEYS.role) ?? 'user';
};

export const setStoredRole = (role: string) => {
  localStorage.setItem(AUTH_STORAGE_KEYS.role, role);
};

export const isReviewer = (): boolean => {
  const r = getStoredRole();
  return r === 'reviewer' || r === 'admin';
};

export const isLoggedIn = (): boolean => {
  return getStoredUsername().trim().length > 0;
};

export const loginUser = (username: string, role: string = 'user') => {
  const trimmed = username.trim();
  localStorage.setItem(AUTH_STORAGE_KEYS.username, trimmed);
  localStorage.setItem(AUTH_STORAGE_KEYS.role, role);
  localStorage.setItem(AUTH_STORAGE_KEYS.loggedIn, 'true');
};

export const logoutUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.username);
  localStorage.removeItem(AUTH_STORAGE_KEYS.loggedIn);
  localStorage.removeItem(AUTH_STORAGE_KEYS.role);
};