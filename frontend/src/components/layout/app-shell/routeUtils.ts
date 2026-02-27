export function isTestDetailsRoute(pathname: string): boolean {
  return /^\/tests\/[^/]+\/?$/.test(pathname);
}
