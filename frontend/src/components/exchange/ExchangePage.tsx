import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useExchangeState } from '../../hooks/useExchange';
import { clearToken, getToken } from '../../services/exchangeApi';
import { Footer } from '../layout/Footer';
import { AdminPanel } from './AdminPanel';
import { LoginForm } from './LoginForm';
import { PositionsTable } from './PositionsTable';
import { ProductDetail } from './ProductDetail';
import { Card, num, PhaseBadge, SectionTitle } from './ui';

export const ExchangePage = () => {
  const [signedIn, setSignedIn] = useState(!!getToken());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useExchangeState(signedIn);

  const signOut = () => {
    clearToken();
    setSignedIn(false);
    setSelectedId(null);
    setShowAdmin(false);
    queryClient.clear();
  };

  // A 401 clears the token in the interceptor; catch up so we show the login form.
  useEffect(() => {
    if (signedIn && isError && !getToken()) setSignedIn(false);
  }, [signedIn, isError]);

  const selected = data?.products.find((p) => p.id === selectedId) ?? null;

  return (
    <div style={{ minHeight: '100dvh' }} className="relative z-10 flex flex-col">
      <div className="bg-slate-800 shadow-lg shadow-slate-900/50">
        <div className="px-4 py-3 sm:px-10 sm:py-4 lg:px-16 flex items-center justify-between gap-2">
          <h1 className="text-slate-100 flex items-end min-w-0">
            <a href="/" className="shrink-0">
              <img src="/lancex-logo.svg" alt="LanceX" className="block h-10 sm:h-[3.2rem]" />
            </a>
          </h1>
          {signedIn && data && (
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm text-slate-400 truncate">
                {data.me.username}
                {data.me.is_admin && <span className="text-xs text-emerald-400 ml-2">admin</span>}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {!signedIn ? (
        <LoginForm onSignedIn={() => setSignedIn(true)} />
      ) : (
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

          {data && (
            <div className="flex flex-col gap-8">
              {data.me.is_admin && (
                <div className="flex gap-2">
                  <Tab active={!showAdmin} onClick={() => setShowAdmin(false)}>
                    Products
                  </Tab>
                  <Tab active={showAdmin} onClick={() => setShowAdmin(true)}>
                    Admin
                  </Tab>
                </div>
              )}

              {showAdmin && data.me.is_admin ? (
                <AdminPanel products={data.products} users={data.users} />
              ) : selected ? (
                <ProductDetail product={selected} me={data.me} onBack={() => setSelectedId(null)} />
              ) : (
                <>
                  <section>
                    <SectionTitle>Your positions</SectionTitle>
                    <Card className="overflow-hidden">
                      <PositionsTable positions={data.positions} />
                    </Card>
                  </section>

                  <section>
                    <SectionTitle>Products</SectionTitle>
                    {data.products.length === 0 ? (
                      <Card className="p-6">
                        <p className="text-sm text-slate-500">
                          No products yet. An admin needs to create one.
                        </p>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {data.products.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => setSelectedId(product.id)}
                            className="text-left bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg
                                       p-5 border-l-4 border-emerald-500/70 transition-shadow duration-500
                                       hover:shadow-[0_0_32px_rgba(16,185,129,0.35)]"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-slate-100 font-semibold">{product.name}</span>
                              <PhaseBadge phase={product.phase} />
                            </div>
                            <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                              {product.description || 'No description'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {product.bid === null
                                ? 'No market yet'
                                : `${num(product.bid)} @ ${num(product.ask)} · maker ${product.maker}`}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {product.participants.length} player
                              {product.participants.length === 1 ? '' : 's'}
                              {product.participants.includes(data.me.username) && ' · joined'}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}
        </main>
      )}

      <Footer />
    </div>
  );
};

const Tab = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
    }`}
  >
    {children}
  </button>
);
