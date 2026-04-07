import { useMemo, useState, type FormEvent } from 'react';
import { supabase } from '../supabase';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const title = useMemo(
    () => (mode === 'login' ? 'Entrar no NumOn CRM' : 'Criar acesso ao NumOn CRM'),
    [mode],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const action = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });

    const { error } = await action;

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(mode === 'login' ? 'Login realizado com sucesso.' : 'Conta criada. Verifique seu e-mail se a confirmação estiver ativa.');
    setLoading(false);
    onAuthenticated();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card glass-card">
        <div className="brand-block">
          <span className="eyebrow">NUMON CRM</span>
          <h1>{title}</h1>
          <p>CRM clean, dark premium e centrado em estabilidade operacional.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              required
              placeholder="voce@empresa.com"
            />
          </label>

          <label>
            <span>Senha</span>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </label>

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="auth-footer">
          <button className="ghost-button" type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Criar novo acesso' : 'Já tenho conta'}
          </button>
          {message ? <p className="status-message">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
