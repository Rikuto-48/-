import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/useAuth'

function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) {
    return <Navigate to="/admin/leads" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!supabase) {
      setError('Supabaseが設定されていません。環境変数を確認してください。')
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setSubmitting(false)

    if (signInError) {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
    }
  }

  return (
    <main className="page">
      <div className="container">
        <h1 className="admin-title">管理画面ログイン</h1>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="form-field">
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="form-field">
            パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default LoginPage
