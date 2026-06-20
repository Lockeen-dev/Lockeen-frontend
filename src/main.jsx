import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const ASSET_RELOAD_KEY = 'lockeen:last-asset-reload';
const ASSET_RELOAD_COOLDOWN_MS = 30000;

function isStaleAssetError(error) {
  const message = String(error?.message || error?.reason?.message || error?.filename || error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk|Expected a JavaScript module script|module script|MIME type|disallowed MIME type|text\/html|Load failed/i.test(message);
}

function reloadForStaleAsset(error) {
  if (!isStaleAssetError(error)) return false;
  const lastReload = Number(sessionStorage.getItem(ASSET_RELOAD_KEY) || 0);
  if (Date.now() - lastReload < ASSET_RELOAD_COOLDOWN_MS) return false;
  sessionStorage.setItem(ASSET_RELOAD_KEY, String(Date.now()));
  window.location.reload();
  return true;
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForStaleAsset(event.payload || event);
});

window.addEventListener('unhandledrejection', (event) => {
  if (reloadForStaleAsset(event.reason)) event.preventDefault();
});

window.addEventListener('error', (event) => {
  reloadForStaleAsset(event.error || event.message || event.filename);
});

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('Root render error', error);
    reloadForStaleAsset(error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F7F8FC', color: '#101033', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ width: 'min(440px, 100%)', border: '1px solid #E5E7EB', borderRadius: 22, background: '#fff', boxShadow: '0 24px 70px rgba(15, 16, 53, .12)', padding: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Something went wrong</div>
          <p style={{ margin: '10px 0 22px', color: '#6B7280', fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
            Reload the app to continue. If this keeps happening, the latest action needs a quick fix.
          </p>
          <button type="button" onClick={() => window.location.reload()} style={{ width: '100%', height: 52, border: 0, borderRadius: 14, background: '#3F35F2', color: '#fff', fontSize: 16, fontWeight: 900, cursor: 'pointer' }}>
            Reload app
          </button>
          {this.state.error?.message && (
            <details style={{ marginTop: 16, color: '#6B7280', fontSize: 12, fontWeight: 700, lineHeight: 1.45 }}>
              <summary style={{ cursor: 'pointer' }}>Technical details</summary>
              <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                {String(this.state.error.message)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
