const RAW_API_MODE = import.meta.env.VITE_API_MODE;
const API_MODE = RAW_API_MODE === 'real' || RAW_API_MODE === 'mock'
  ? RAW_API_MODE
  : (import.meta.env.PROD ? 'real' : 'mock');

export function getApiMode() {
  return API_MODE;
}

export function isMockMode() {
  return API_MODE === 'mock';
}
