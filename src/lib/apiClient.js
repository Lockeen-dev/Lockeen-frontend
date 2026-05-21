const API_MODE = import.meta.env.VITE_API_MODE || 'mock';

export function getApiMode() {
  return API_MODE;
}

export function isMockMode() {
  return API_MODE === 'mock';
}
