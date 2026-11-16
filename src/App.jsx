import { useState } from 'react';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';

export default function App() {
  // 'landing' | 'auth' | 'app'
  const [screen, setScreen] = useState('landing');
  // Which auth view to open: 'login' | 'register'.
  const [authMode, setAuthMode] = useState('login');
  // Holds trial/account metadata when a user registers (null for plain sign-in).
  const [account, setAccount] = useState(null);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setScreen('auth');
  };

  const handleLogin = (accountData = null) => {
    if (accountData) setAccount(accountData);
    setScreen('app');
  };

  if (screen === 'landing') {
    return (
      <LandingPage
        onSignIn={() => openAuth('login')}
        onGetStarted={() => openAuth('register')}
      />
    );
  }

  if (screen === 'auth') {
    return (
      <LoginPage
        initialMode={authMode}
        onLogin={handleLogin}
        onBack={() => setScreen('landing')}
      />
    );
  }

  return <InventoryPage account={account} />;
}
