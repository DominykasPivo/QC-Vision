import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isLoggedIn, loginUser } from '@/lib/auth';

export function Login() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [touched, setTouched] = useState(false);

    const trimmed = useMemo(() => name.trim(), [name]);
    const isValid = trimmed.length > 0;

    if (isLoggedIn()) {
        return <Navigate to="/tests" replace />;
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setTouched(true);
        if (!isValid) {
            return;
        }
        loginUser(trimmed);
        navigate('/tests', { replace: true });
    };

    return (
        <main className="login-page">
            <div className="login-shell">
                <section className="login-brand-panel">
                    <p className="login-brand-kicker">QC Vision</p>
                    <h2 className="login-brand-title">Quality Control, One Focused Workspace.</h2>
                    <p className="login-brand-copy">
                        Track quality tests, review photos, and document defects in one simple workflow.
                    </p>
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
                            aria-invalid={touched && !isValid}
                            aria-describedby={touched && !isValid ? 'login-error' : undefined}
                            placeholder="Your username"
                        />
                        <div className="login-error" aria-live="polite" id="login-error">
                            {touched && !isValid ? 'Please enter your username to continue.' : ' '}
                        </div>

                        <button className="btn btn-primary btn-block login-button" type="submit" disabled={!isValid}>
                            Login
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
}
