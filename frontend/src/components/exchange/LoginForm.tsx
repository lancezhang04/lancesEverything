import { FormEvent, useState } from 'react';
import { useLogin } from '../../hooks/useExchange';
import { errorMessage, setToken } from '../../services/exchangeApi';
import { buttonClass, Card, ErrorNote, inputClass } from './ui';

interface LoginFormProps {
  onSignedIn: () => void;
}

/** One button for both paths: an unknown username creates the account. */
export const LoginForm = ({ onSignedIn }: LoginFormProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate(
      { username, password },
      {
        onSuccess: (data) => {
          setToken(data.token);
          onSignedIn();
        },
      }
    );
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm p-6 border-l-4 border-emerald-500/70">
        <h2 className="text-2xl font-semibold text-slate-100 mb-1">Sign in</h2>
        <p className="text-sm text-slate-400 mb-6">
          Sign in, or pick a new username to create an account.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            className={`${inputClass} w-full`}
            placeholder="Username"
            value={username}
            autoCapitalize="none"
            autoCorrect="off"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className={`${inputClass} w-full`}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <ErrorNote message={login.isError ? errorMessage(login.error) : null} />

          <button
            type="submit"
            disabled={!username || !password || login.isPending}
            className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700 mt-1`}
          >
            {login.isPending ? 'Signing in…' : 'Sign in / Create account'}
          </button>
        </form>
      </Card>
    </div>
  );
};
