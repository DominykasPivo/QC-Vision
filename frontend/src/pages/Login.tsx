import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isLoggedIn, loginUser, setStoredRole } from '@/lib/auth';
import { request, ApiError } from '@/lib/api/http';

type MeResponse = { username: string; role: 'admin' | 'user' | 'reviewer' };

export function Login() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const trimmed = useMemo(() => name.trim(), [name]);

  // username must be exactly 5 characters
  const isValid = trimmed.length === 5;

  if (isLoggedIn()) {
    return <Navigate to="/tests" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    setServerError(null);

    if (!isValid) return;

    try {
      const me = await request<MeResponse>('/api/v1/users/me', {
        method: 'GET',
        headers: {
          'X-User': trimmed,
        },
      });

      loginUser(me.username);
      setStoredRole(me.role);

      navigate('/tests', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Login failed.');
      }
    }
  };

  const errorText =
    touched && !isValid
      ? 'Username must be exactly 5 characters.'
      : serverError
        ? serverError
        : ' ';

  return (
    <div className="login-page">
      <div className="login-card" role="main">
        <h1 className="login-title">QC Vision</h1>
        <p className="login-helper">Enter your username to continue</p>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <label className="form-label" htmlFor="login-name">
            Username
          </label>

          <input
            id="login-name"
            name="name"
            className="form-input login-input"
            type="text"
            autoComplete="username"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={(touched && !isValid) || Boolean(serverError)}
            aria-describedby="login-error"
            placeholder="Enter Username"
            maxLength={5}
          />

          <div className="login-error" aria-live="polite" id="login-error">
            {errorText}
          </div>

          <button className="btn btn-primary btn-block login-button" type="submit" disabled={!isValid}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}