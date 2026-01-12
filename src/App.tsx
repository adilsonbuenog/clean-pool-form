import { ServiceForm } from './components/ServiceForm';
import { useEffect, useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import type { SessionUser } from './types/auth';
import { clearSession, getSessionToken, getSessionUser, setSessionToken, setSessionUser } from './auth/session';
import { AdminDashboard } from './components/AdminDashboard';

function App() {
  const [user, setUser] = useState<SessionUser | null>(getSessionUser());
  const [token, setToken] = useState<string | null>(getSessionToken());
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState<'form' | 'admin'>('form');

  useEffect(() => {
    const run = async () => {
      const currentToken = getSessionToken();
      if (!currentToken) {
        setCheckingSession(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (!response.ok) {
          clearSession();
          setUser(null);
          setToken(null);
          setCheckingSession(false);
          return;
        }
        const data = (await response.json()) as { user?: SessionUser };
        if (data.user) {
          setSessionUser(data.user);
          setUser(data.user);
          setToken(currentToken);
        }
      } finally {
        setCheckingSession(false);
      }
    };

    void run();
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: SessionUser) => {
    setSessionToken(newToken);
    setSessionUser(newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = async () => {
    try {
      const currentToken = getSessionToken();
      if (currentToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      }
    } finally {
      clearSession();
      setToken(null);
      setUser(null);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="text-[#838B9B] text-sm">Carregando...</div>
      </div>
    );
  }

  if (!user || !token) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <img
              src="/cleanpool_logo_transparent_final_4x.png"
              alt="Clean Pool"
              className="h-10 sm:h-12"
            />

            <div className="flex items-center gap-3">
              {user.role === 'admin' && (
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => setPage('form')}
                    className={`px-4 py-2 text-sm rounded-xl border transition-colors ${
                      page === 'form'
                        ? 'border-[#60A9DC] text-[#60A9DC] bg-blue-50'
                        : 'border-gray-200 text-[#6D7689] hover:bg-gray-50'
                    }`}
                    type="button"
                  >
                    Registro
                  </button>
                  <button
                    onClick={() => setPage('admin')}
                    className={`px-4 py-2 text-sm rounded-xl border transition-colors ${
                      page === 'admin'
                        ? 'border-[#60A9DC] text-[#60A9DC] bg-blue-50'
                        : 'border-gray-200 text-[#6D7689] hover:bg-gray-50'
                    }`}
                    type="button"
                  >
                    Painel
                  </button>
                </div>
              )}
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-[#6D7689]">{user.email}</div>
                <div className="text-xs text-[#838B9B] capitalize">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-[#6D7689] hover:bg-gray-50 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {page === 'admin' && user.role === 'admin' ? (
            <AdminDashboard token={token} user={user} />
          ) : (
            <>
              <div className="text-center mb-8 sm:mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#6D7689] mb-3">
                  Registro de Serviço
                </h1>
                <p className="text-[#838B9B] text-sm sm:text-base max-w-2xl mx-auto">
                  Preencha e envie para o cliente e para a Clean Pool.
                </p>
              </div>
              <ServiceForm />
            </>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-[#838B9B]">
            Clean Pool • Atendimento e manutenção
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
