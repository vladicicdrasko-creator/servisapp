'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { BrandZaglavljeForme } from '@/components/BrandLogo'
import { forma } from '@/components/brendStil'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Pogrešan email ili lozinka')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div style={forma.centar}>
      <form onSubmit={handleLogin} style={forma.kartica}>
        <BrandZaglavljeForme oznaka="Admin panel" />

        <label style={forma.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={forma.polje}
          placeholder="admin@coffeeteam.me"
          maxLength={100}
          required
        />

        <label style={forma.label}>Lozinka</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ ...forma.polje, paddingRight: 40 }}
            placeholder="••••••••"
            maxLength={128}
            required
          />
          <button type="button" onClick={() => setShowPassword(v => !v)} style={{ ...forma.oko, top: 'calc(50% - 6px)' }} tabIndex={-1}>
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>

        {error && <div style={forma.greska}>{error}</div>}

        <button type="submit" disabled={loading} style={{ ...forma.dugme, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Prijava...' : 'Prijavi se'}
        </button>
      </form>
    </div>
  )
}
