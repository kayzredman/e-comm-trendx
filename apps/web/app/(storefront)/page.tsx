export default function StorefrontHome() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--color-page)' }}>
      <div className="max-w-md mx-auto px-4 py-8 sm:max-w-2xl md:max-w-4xl lg:max-w-6xl">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Welcome to TrendMarga
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }} className="mt-2 text-sm">
          Shop the latest trends — fast delivery across Ghana.
        </p>
      </div>
    </main>
  )
}
