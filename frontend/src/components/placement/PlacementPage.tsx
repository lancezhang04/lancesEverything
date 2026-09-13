import { useEffect, useState } from 'react';
import { Footer } from '../layout/Footer';
import { useDefaults, useSolve } from '../../hooks/usePlacement';
import type { PlacementRequest, PlacementResponse } from '../../types/placement';
import { DragPanel } from './DragPanel';
import { PlacementPanel } from './PlacementPanel';
import { GrowthPanel } from './GrowthPanel';

export const PlacementPage = () => {
  const { data: defaults, isLoading, error: defaultsError } = useDefaults();
  const solve = useSolve();

  // All inputs are ephemeral React state. No persistence, no profile files.
  const [request, setRequest] = useState<PlacementRequest | null>(null);
  const [result, setResult] = useState<PlacementResponse | null>(null);

  useEffect(() => {
    document.title = "Lance's Placement";
    return () => {
      document.title = "Lance's Everything";
    };
  }, []);

  useEffect(() => {
    if (defaults && !request) setRequest(defaults.request);
  }, [defaults, request]);

  // Recompute live on every edit. `mutate` keeps the last good result on screen
  // while the next one is in flight, so the panels never flash empty.
  const { mutate } = solve;
  useEffect(() => {
    if (request) mutate(request, { onSuccess: setResult });
  }, [request, mutate]);

  const errorMessage =
    (defaultsError as Error | null)?.message ?? (solve.error as Error | null)?.message ?? null;

  return (
    <div style={{ minHeight: '100dvh' }} className="relative z-10 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-800/95 backdrop-blur-sm shadow-lg shadow-slate-900/50">
        <div className="px-4 py-3 sm:px-10 sm:py-4 lg:px-16">
          <h1 className="text-slate-100">
            <div className="flex items-end gap-3">
              <a href="/">
                <img
                  src="/lances-logo.svg"
                  alt="Lance's"
                  className="inline-block h-12 sm:h-[3.2rem]"
                />
              </a>
              <span className="hidden sm:inline text-3xl">Placement</span>
            </div>
            <span className="block sm:hidden text-lg mt-1">Placement</span>
          </h1>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {errorMessage && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 text-sm mb-6">
            {errorMessage}
          </div>
        )}

        {result?.warnings.map((warning) => (
          <div
            key={warning}
            className="bg-amber-900/20 border border-amber-800/60 text-amber-300 rounded-lg p-3 text-sm mb-4 font-mono"
          >
            {warning}
          </div>
        ))}

        {isLoading || !request ? (
          <div className="text-center py-20 text-slate-500 font-mono text-sm">Loading…</div>
        ) : (
          <div className="space-y-6">
            <DragPanel
              request={request}
              result={result}
              reference={defaults?.reference_yields ?? []}
              onChange={setRequest}
            />
            <PlacementPanel request={request} result={result} onChange={setRequest} />
            <GrowthPanel request={request} result={result} onChange={setRequest} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
