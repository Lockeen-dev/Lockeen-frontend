import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import StaticPage from './pages/StaticPage';
import { staticPageNames } from './content/staticPages';

function LegacyRedirect({ page }) {
  return <Navigate to={'/' + page} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<LandingPage />} />
        {staticPageNames.map((page) => (
          <Route key={page} path={'/' + page} element={<StaticPage />} />
        ))}
        {staticPageNames.map((page) => (
          <Route key={page + '.html'} path={'/' + page + '.html'} element={<LegacyRedirect page={page} />} />
        ))}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
