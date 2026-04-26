import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ReferralLandingPage from './pages/ReferralLandingPage';
import './styles.css';

const isReferralPage = window.location.pathname === '/indique';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isReferralPage ? <ReferralLandingPage /> : <App />}
  </React.StrictMode>,
);