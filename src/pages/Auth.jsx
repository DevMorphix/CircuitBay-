import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FieldError, FormError, FormSent } from '../components/ui/FormBits.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api, fieldErrors } from '../lib/api.js'

// Only allow same-site relative redirects after sign-in
const safeNext = (params) => {
  const next = params.get('next') ?? '/account'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/account'
}

function AuthShell({ title, seoTitle, path, children, footer }) {
  return (
    <PageShell shop seo={{ title: seoTitle ?? title, path, noindex: true }}>
      <PageHero compact align="center" title={title} />
      <Section tone="soft" width="max-w-md" className="pt-10!">
        <div className="card p-6 sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-ink-600">{footer}</div>}
      </Section>
    </PageShell>
  )
}

function Field({ id, label, error, ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-900">
        {label}
      </label>
      <input id={id} className="field" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      <FieldError id={`${id}-err`} message={error} />
    </div>
  )
}

// Shared submit wrapper: runs `fn`, maps API errors to form/field messages
function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})
  const run = async (fn) => {
    setBusy(true)
    setError('')
    setFields({})
    try {
      return await fn()
    } catch (err) {
      setError(err.message)
      setFields(fieldErrors(err))
      return undefined
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, fields, run }
}

// ------------------------------------------------------------------ login --
export function Login() {
  const [params] = useSearchParams()
  const { status, signedIn } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('email')
  const next = safeNext(params)

  if (status === 'signed-in') return <Navigate to={next} replace />
  const done = (user) => {
    signedIn(user)
    navigate(next, { replace: true })
  }

  return (
    <AuthShell
      title="Sign in to CircuitBay"
      seoTitle="Sign in"
      path="/login"
      footer={
        <>
          New here? <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700">Create an account</Link>
        </>
      }
    >
      <div role="tablist" aria-label="Sign-in method" className="mb-6 grid grid-cols-2 rounded-xl bg-surface-soft p-1">
        {[
          ['email', 'Email'],
          ['phone', 'Mobile OTP'],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`rounded-lg py-2 text-sm font-semibold ${mode === id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'email' ? <EmailLogin onDone={done} /> : <PhoneLogin onDone={done} />}
    </AuthShell>
  )
}

function EmailLogin({ onDone }) {
  const a = useAction()
  const submit = async (e) => {
    e.preventDefault()
    const d = Object.fromEntries(new FormData(e.currentTarget))
    const r = await a.run(() => api.post('/auth/login', d))
    if (r) onDone(r.user)
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="li-email" name="email" type="email" label="Email" autoComplete="email" required error={a.fields.email} />
      <Field id="li-pass" name="password" type="password" label="Password" autoComplete="current-password" required />
      <FormError message={a.error} />
      <Button type="submit" className="w-full" disabled={a.busy}>
        {a.busy ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-center text-sm">
        <Link to="/forgot-password" className="font-semibold text-brand-700">Forgot password?</Link>
      </p>
    </form>
  )
}

function PhoneLogin({ onDone }) {
  const a = useAction()
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(false)

  const request = async (e) => {
    e?.preventDefault()
    const r = await a.run(() => api.post('/auth/otp/request', { phone }))
    if (r) setSent(true)
  }
  const verify = async (e) => {
    e.preventDefault()
    const code = new FormData(e.currentTarget).get('code')
    const r = await a.run(() => api.post('/auth/otp/verify', { phone, code }))
    if (r) onDone(r.user)
  }

  return sent ? (
    <form onSubmit={verify} className="space-y-4">
      <p className="text-sm text-ink-600">
        We sent a 6-digit code to <span className="font-semibold text-ink-900">{phone}</span>. It expires in 10 minutes.
      </p>
      <Field id="otp-code" name="code" label="Code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required error={a.fields.code} />
      <FormError message={a.error} />
      <Button type="submit" className="w-full" disabled={a.busy}>
        {a.busy ? 'Checking…' : 'Verify and sign in'}
      </Button>
      <p className="flex justify-between text-sm">
        <button type="button" onClick={() => setSent(false)} className="font-semibold text-brand-700">Change number</button>
        <button type="button" onClick={request} disabled={a.busy} className="font-semibold text-brand-700">Resend code</button>
      </p>
    </form>
  ) : (
    <form onSubmit={request} className="space-y-4">
      <Field id="otp-phone" label="Mobile number" type="tel" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} required error={a.fields.phone} />
      <FormError message={a.error} />
      <Button type="submit" className="w-full" disabled={a.busy}>
        {a.busy ? 'Sending…' : 'Send code'}
      </Button>
      <p className="text-xs text-ink-400">New numbers get an account automatically.</p>
    </form>
  )
}

// --------------------------------------------------------------- register --
export function Register() {
  const [params] = useSearchParams()
  const { status, signedIn } = useAuth()
  const navigate = useNavigate()
  const a = useAction()
  const next = safeNext(params)
  if (status === 'signed-in') return <Navigate to={next} replace />

  const submit = async (e) => {
    e.preventDefault()
    const d = Object.fromEntries([...new FormData(e.currentTarget)].filter(([, v]) => v !== ''))
    const r = await a.run(() => api.post('/auth/register', d))
    if (r) {
      signedIn(r.user)
      navigate(next, { replace: true })
    }
  }

  return (
    <AuthShell
      title="Create your account"
      seoTitle="Create an account"
      path="/register"
      footer={
        <>
          Already have one? <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700">Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field id="rg-name" name="name" label="Name" autoComplete="name" error={a.fields.name} />
        <Field id="rg-email" name="email" type="email" label="Email" autoComplete="email" required error={a.fields.email} />
        <Field id="rg-phone" name="phone" type="tel" label="Mobile number (optional)" autoComplete="tel" error={a.fields.phone} />
        <Field id="rg-pass" name="password" type="password" label="Password (8+ characters)" autoComplete="new-password" minLength={8} required error={a.fields.password} />
        <FormError message={a.error} />
        <Button type="submit" className="w-full" disabled={a.busy}>
          {a.busy ? 'Creating…' : 'Create account'}
        </Button>
        <p className="text-xs text-ink-400">
          By continuing you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy-policy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
    </AuthShell>
  )
}

// ------------------------------------------------------- forgot / reset --
export function ForgotPassword() {
  const a = useAction()
  const [sent, setSent] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email')
    if (await a.run(() => api.post('/auth/password/forgot', { email }))) setSent(true)
  }
  return (
    <AuthShell title="Reset your password" path="/forgot-password" footer={<Link to="/login" className="font-semibold text-brand-700">Back to sign in</Link>}>
      {sent ? (
        <FormSent>If that email has an account, a reset link is on its way. It's valid for one hour.</FormSent>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field id="fp-email" name="email" type="email" label="Email" autoComplete="email" required error={a.fields.email} />
          <FormError message={a.error} />
          <Button type="submit" className="w-full" disabled={a.busy}>
            {a.busy ? 'Sending…' : 'Email me a reset link'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const { signedIn } = useAuth()
  const navigate = useNavigate()
  const a = useAction()
  const token = params.get('token') ?? ''

  const submit = async (e) => {
    e.preventDefault()
    const password = new FormData(e.currentTarget).get('password')
    const r = await a.run(() => api.post('/auth/password/reset', { token, password }))
    if (r) {
      signedIn(r.user)
      navigate('/account', { replace: true })
    }
  }

  return (
    <AuthShell title="Choose a new password" path="/reset-password">
      {!token ? (
        <p className="text-ink-600">
          This link is incomplete. <Link to="/forgot-password" className="font-semibold text-brand-700">Request a new one</Link>.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field id="rp-pass" name="password" type="password" label="New password (8+ characters)" autoComplete="new-password" minLength={8} required error={a.fields.password} />
          <FormError message={a.error} />
          <Button type="submit" className="w-full" disabled={a.busy}>
            {a.busy ? 'Saving…' : 'Save and sign in'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
