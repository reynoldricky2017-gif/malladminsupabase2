export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://axionix-backend.vercel.app'
    : 'http://localhost:5000')
).replace(/\/$/, '');
