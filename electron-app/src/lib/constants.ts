// The Electron app is now independent and contains its own API routes
// We use relative paths in development and production
export const API_BASE_URL = ''; 

export const getApiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Use explicit localhost:4000 in dev if needed, or just relative
  return cleanPath; 
};
