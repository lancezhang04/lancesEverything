import { Footer } from './Footer';

export const HomePage = () => {
  return (
    <div style={{ minHeight: '100dvh' }} className="relative z-10 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-800/95 backdrop-blur-sm shadow-lg shadow-slate-900/50">
        <div className="px-4 py-3 sm:px-10 sm:py-4 lg:px-16">
          <h1 className="text-slate-100">
            <div className="flex items-end gap-3">
              <img src="/lances-logo.svg" alt="Lance's" className="inline-block h-12 sm:h-[3.2rem]" />
              <span className="hidden sm:inline text-3xl">Everything</span>
            </div>
            <span className="block sm:hidden text-lg mt-1">Everything</span>
          </h1>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 content-start">
          {/* Portfolio Analyzer card */}
          <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-6 flex flex-col gap-4 min-h-[227px] border-l-4 border-blue-500/70 transition-shadow duration-500 hover:shadow-[0_0_32px_rgba(59,130,246,0.4)]">
            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-2 flex items-center gap-2">
                Factor Portfolio Analyzer
                <span className="text-sm font-mono bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded">WIP</span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Analyze your equity portfolio through a five-factor lens. Track
                current holdings, set target factor loadings, and calculate
                optimal rebalancing trades.
              </p>
            </div>
            <a
              href="/portfolio"
              className="mt-auto inline-block px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center transition-colors"
            >
              Open Tool →
            </a>
          </div>

          {/* Workout Routine card */}
          <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-6 flex flex-col gap-4 min-h-[227px] border-l-4 border-amber-500/70 transition-shadow duration-500 hover:shadow-[0_0_32px_rgba(245,158,11,0.4)]">
            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-2 flex items-center gap-2">
                Workouts
                <span className="text-sm font-mono bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded">WIP</span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                My weekly training split optimized for longevity and muscle
                growth. Includes exercise demos, muscle activation ratings,
                and methodology notes.
              </p>
            </div>
            <a
              href="/workout"
              className="mt-auto inline-block px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 text-center transition-colors"
            >
              View Routine →
            </a>
          </div>

          {/* Exchange card */}
          <div className="bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-6 flex flex-col gap-4 min-h-[227px] border-l-4 border-emerald-500/70 transition-shadow duration-500 hover:shadow-[0_0_32px_rgba(16,185,129,0.4)]">
            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-2 flex items-center gap-2">
                LanceX
                <span className="text-sm font-mono bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded">WIP</span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Play "make a market" with friends. Quote a tightening bid-ask on
                any event, lift or hit someone else's market, then settle up
                when the tally comes in.
              </p>
            </div>
            <a
              href="/exchange"
              className="mt-auto inline-block px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-center transition-colors"
            >
              Open LanceX →
            </a>
          </div>

          {/* Placeholder cards */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg p-6 border-2 border-dashed border-slate-600/50 flex items-center justify-center min-h-[227px]"
            >
              <span className="text-sm text-slate-600">Coming soon</span>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};
