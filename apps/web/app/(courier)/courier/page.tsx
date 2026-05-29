'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { courierApi, courierAuth } from '@/lib/courier-api'

export default function CourierLoginPage() {
  const router = useRouter()
  const search = useSearchParams()
  const nextPath = search?.get('next') ?? '/courier/jobs'

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  // If already signed in, skip straight to jobs
  useEffect(() => {
    if (courierAuth.getToken()) router.replace(nextPath)
  }, [router, nextPath])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null); setInfo(null)
    if (phone.replace(/\D/g, '').length < 9) {
      setError('Enter a valid Ghana phone number'); return
    }
    setLoading(true)
    try {
      const res = await courierApi.requestOtp(phone)
      setInfo(`Code sent to ${phone}. Expires in ${res.expiresInMin} minutes.`)
      setStep('otp')
      setCooldown(45)
      setTimeout(() => inputs.current[0]?.focus(), 100)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function setDigit(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]; next[idx] = digit; setCode(next)
    if (digit && idx < 5) inputs.current[idx + 1]?.focus()
  }
  function onKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) inputs.current[idx - 1]?.focus()
  }
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      e.preventDefault()
      setCode(text.split(''))
      inputs.current[5]?.focus()
    }
  }

  async function verify() {
    const joined = code.join('')
    if (joined.length !== 6) { setError('Enter all 6 digits'); return }
    setError(null); setLoading(true)
    try {
      const res = await courierApi.verifyOtp(phone, joined)
      courierAuth.setSession(res.token, res.courier)
      router.replace(nextPath)
    } catch (err) {
      setError((err as Error).message)
      setCode(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cr-shell" style={{ background: 'linear-gradient(180deg,#fff 0%,#F9FAFB 100%)' }}>
      <div style={{ flex: 1, padding: '40px 24px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 28, fontWeight: 700, color: '#0A0A0B', display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
          <span>trend<span style={{ color: '#1E40AF' }}>M</span>arga</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', marginBottom: 8, animation: 'tm-pulse 1.6s ease-in-out infinite', display: 'inline-block' }} />
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 38 }}>Courier</div>

        {step === 'phone' ? (
          <form onSubmit={requestOtp}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.2, color: '#0F172A', marginBottom: 8 }}>Sign in</div>
            <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.5, marginBottom: 28 }}>
              Enter your registered phone number. We'll text you a 6-digit code.
            </div>

            <div className="cr-field" style={{ marginBottom: 18 }}>
              <label>Phone number</label>
              <div className="cr-phone-input">
                <span className="cr-cc">🇬🇭 +233</span>
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="24 555 0142"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="cr-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button className="cr-btn" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.2, color: '#0F172A', marginBottom: 8 }}>Enter code</div>
            <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.5, marginBottom: 24 }}>
              We sent a 6-digit code to <strong style={{ color: '#0F172A' }}>+233 {phone}</strong>.
            </div>

            <div className="cr-otp-row" style={{ marginBottom: 14 }}>
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputs.current[i] = el }}
                  className={`cr-otp-box ${d ? 'cr-filled' : ''}`}
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => setDigit(i, e.target.value)}
                  onKeyDown={e => onKey(i, e)}
                  onPaste={onPaste}
                />
              ))}
            </div>

            {info && <div className="cr-info" style={{ marginBottom: 12 }}>{info}</div>}
            {error && <div className="cr-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button className="cr-btn" onClick={verify} disabled={loading || code.join('').length !== 6}>
              {loading ? 'Verifying…' : 'Verify & continue'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 18 }}>
              Didn't get it?{' '}
              {cooldown > 0
                ? <span>Resend in {cooldown}s</span>
                : <button onClick={() => requestOtp()} style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', padding: 0, font: 'inherit' }}>Resend code</button>
              }
            </div>

            <button className="cr-btn cr-ghost" onClick={() => { setStep('phone'); setError(null); setInfo(null) }}>
              Change phone number
            </button>
          </>
        )}

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', paddingTop: 18 }}>
          By continuing you accept the courier terms.
        </div>
      </div>
    </div>
  )
}
