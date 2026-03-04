import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/auth/authContext'
import { ApiError } from '../../core/api/apiClient'
import { Banner } from '../../ui/components/Banner'
import { Button } from '../../ui/components/Button'
import { Card } from '../../ui/components/Card'
import { Field } from '../../ui/components/Field'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = useMemo(() => username.trim().length > 0 && password.length > 0, [username, password])

  if (user) {
    return <Navigate to="/trips" replace />
  }

  const from = (location.state as { from?: string } | null)?.from ?? '/trips'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValid) {
      return
    }

    setError(null)
    setLoading(true)

    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Errore inatteso durante il login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <Card>
        <div className="stack">
          <h1>Accedi</h1>
          <p className="muted">Inserisci le credenziali per entrare nella gestione viaggi.</p>
          {error ? <Banner type="error" message={error} /> : null}

          <form onSubmit={handleSubmit} className="stack" noValidate>
            <Field
              id="username"
              label="Username"
              requiredLabel
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
            <Field
              id="password"
              label="Password"
              type="password"
              requiredLabel
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />

            <Button type="submit" disabled={!isValid || loading}>
              {loading ? 'Accesso in corso...' : 'Entra'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
