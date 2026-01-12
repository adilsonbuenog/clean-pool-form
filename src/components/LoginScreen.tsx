import { FormEvent, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { SessionUser } from '../types/auth';

export const LoginScreen = ({
  onLoginSuccess,
}: {
  onLoginSuccess: (token: string, user: SessionUser) => void;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { token?: string; user?: SessionUser; error?: string };
      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao entrar');
      }
      if (!data.token || !data.user) {
        throw new Error('Resposta inválida do servidor');
      }

      onLoginSuccess(data.token, data.user);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao entrar');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          <img
            src="/cleanpool_logo_transparent_final_4x.png"
            alt="Clean Pool"
            className="h-10"
          />
        </div>

        <h1 className="text-2xl font-semibold text-[#6D7689] text-center mb-2">Entrar</h1>
        <p className="text-sm text-[#838B9B] text-center mb-6">
          Acesse o sistema com seu email e senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#6D7689] mb-2">Email</label>
            <input
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#60A9DC] focus:border-transparent text-[#6D7689]"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6D7689] mb-2">Senha</label>
            <input
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#60A9DC] focus:border-transparent text-[#6D7689]"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {status === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full px-6 py-3.5 bg-[#60A9DC] text-white rounded-xl font-medium hover:bg-[#4E96C9] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

