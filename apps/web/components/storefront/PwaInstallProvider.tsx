'use client'

import { useEffect, useState } from 'react'
import { Download, X, Bell, BellOff } from 'lucide-react'
import { publicFeatures } from '@trendmarga/config'
import { pushApi } from '@/lib/api'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const INSTALL_DISMISS_KEY = 'tm.install.dismissed'
const PUSH_DISMISS_KEY = 'tm.push.dismissed'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export default function PwaInstallProvider() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showPush, setShowPush] = useState(false)
  const [busy, setBusy] = useState(false)

  // Register service worker once.
  useEffect(() => {
    if (!publicFeatures.pwa) return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  // Capture install prompt.
  useEffect(() => {
    if (!publicFeatures.pwa) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(INSTALL_DISMISS_KEY) === '1') return
    const onBip = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as BeforeInstallPromptEvent)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  // Decide whether to show push opt-in (only after SW is ready, push supported,
  // no prior dismissal, and Notification permission is still 'default').
  useEffect(() => {
    if (!publicFeatures.pwa) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem(PUSH_DISMISS_KEY) === '1') return
    const t = setTimeout(() => setShowPush(true), 4500)
    return () => clearTimeout(t)
  }, [])

  async function handleInstall() {
    if (!installEvt) return
    setBusy(true)
    try {
      await installEvt.prompt()
      const choice = await installEvt.userChoice
      if (choice.outcome === 'dismissed') {
        localStorage.setItem(INSTALL_DISMISS_KEY, '1')
      }
    } finally {
      setBusy(false)
      setShowInstall(false)
      setInstallEvt(null)
    }
  }

  function dismissInstall() {
    localStorage.setItem(INSTALL_DISMISS_KEY, '1')
    setShowInstall(false)
  }

  async function enablePush() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const { publicKey, configured } = await pushApi.getVapidKey()
      if (!configured || !publicKey) {
        localStorage.setItem(PUSH_DISMISS_KEY, '1')
        return
      }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        localStorage.setItem(PUSH_DISMISS_KEY, '1')
        return
      }
      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        }))
      const json = sub.toJSON() as PushSubscriptionJSON
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return
      await pushApi.subscribe({ ...json, userAgent: navigator.userAgent })
    } catch {
      /* swallow — user can re-enable later */
    } finally {
      setBusy(false)
      setShowPush(false)
    }
  }

  function dismissPush() {
    localStorage.setItem(PUSH_DISMISS_KEY, '1')
    setShowPush(false)
  }

  if (!publicFeatures.pwa) return null

  return (
    <>
      {showInstall && installEvt && (
        <div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-[60] rounded-2xl shadow-2xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          role="dialog"
          aria-label="Install trendMarga"
        >
          <div className="p-4 flex gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#2563EB,#7C3AED)' }}
            >
              <Download size={20} color="#fff" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                Install trendMarga
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Add to your home screen for one-tap shopping.
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Install
                </button>
                <button
                  type="button"
                  onClick={dismissInstall}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissInstall}
              aria-label="Dismiss"
              className="self-start w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {showPush && !showInstall && (
        <div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-[60] rounded-2xl shadow-2xl border"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          role="dialog"
          aria-label="Enable notifications"
        >
          <div className="p-4 flex gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#F97316' }}
            >
              <Bell size={20} color="#fff" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                Get order updates
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Allow push notifications to track deliveries and deals.
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={enablePush}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: '#F97316' }}
                >
                  Enable
                </button>
                <button
                  type="button"
                  onClick={dismissPush}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <BellOff size={12} /> No thanks
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPush}
              aria-label="Dismiss"
              className="self-start w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
