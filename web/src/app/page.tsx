export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚽</span>
            <h1 className="text-xl font-semibold">Toilet Tails</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#" className="hover:underline">How it works</a>
            <a href="#" className="hover:underline">Pricing</a>
            <a href="#" className="hover:underline">Contact</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Turn your pet’s photo into a
              <span className="block text-indigo-600">hilariously realistic bathroom scene</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Upload a pic → choose a scene → get AI‑generated art → print & frame.
              Zero Photoshop, 100% giggles.
            </p>

            <div className="mt-8 flex gap-3">
              <button className="rounded-2xl px-5 py-3 bg-indigo-600 text-white font-medium hover:opacity-90">
                Upload a photo
              </button>
              <button className="rounded-2xl px-5 py-3 border font-medium hover:bg-gray-50">
                See examples
              </button>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              No account needed. Your originals stay private.
            </p>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] w-full rounded-3xl border bg-gradient-to-br from-gray-50 to-white grid place-items-center">
              <div className="text-center px-6">
                <div className="text-6xl mb-3">🐶🧻🪞🛁</div>
                <p className="text-gray-600">
                  Preview area — we’ll render your pet here later.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 rounded-2xl border bg-white px-3 py-2 text-sm shadow-sm">
              Coming soon: upload → render in seconds
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-gray-500">
          © {new Date().getFullYear()} Toilet Tails — Made with ❤️ and too much coffee.
        </div>
      </footer>
    </main>
  );
}
