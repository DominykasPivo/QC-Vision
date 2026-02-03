export const AUTH_STORAGE_KEYS = {
    username: 'qc-vision:username',
    loggedIn: 'qc-vision:logged-in',
} as const;

export const getStoredUsername = (): string => {
    return localStorage.getItem(AUTH_STORAGE_KEYS.username) ?? '';
};

export const isLoggedIn = (): boolean => {
    return getStoredUsername().trim().length > 0;
};

export const loginUser = (username: string) => {
    const trimmed = username.trim();
    localStorage.setItem(AUTH_STORAGE_KEYS.username, trimmed);
    localStorage.setItem(AUTH_STORAGE_KEYS.loggedIn, 'true');
};

export const logoutUser = () => {
    localStorage.removeItem(AUTH_STORAGE_KEYS.username);
    localStorage.removeItem(AUTH_STORAGE_KEYS.loggedIn);
};
