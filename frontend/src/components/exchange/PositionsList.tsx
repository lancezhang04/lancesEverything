import { MyPosition } from '../../types/exchange';
import { Card, money, num, PhaseBadge, Pnl, SideBadge } from './ui';

interface PositionsListProps {
  positions: MyPosition[];
  onOpen: (productId: number) => void;
}

/**
 * One card per position rather than a wide table: on a phone the six columns
 * of the old layout either wrapped badly or scrolled sideways with no visible
 * scrollbar. The headline numbers sit on the card; tapping opens the market.
 */
export const PositionsList = ({ positions, onOpen }: PositionsListProps) => {
  if (positions.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-500 text-center">
          No positions yet. Join a market below to get started.
        </p>
      </Card>
    );
  }

  const marked = positions.filter((p) => p.pnl !== null);
  const total = marked.reduce((sum, p) => sum + (p.pnl ?? 0), 0);
  const open = positions.filter((p) => p.phase !== 'SETTLED').length;

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-4 flex items-center justify-between gap-4 border-l-4 border-emerald-500/70">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total P&amp;L</p>
          <p className="text-2xl">
            <Pnl value={marked.length > 0 ? total : null} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Positions</p>
          <p className="text-lg text-slate-100">
            {positions.length}
            {open > 0 && <span className="text-sm text-slate-500 ml-2">{open} open</span>}
          </p>
        </div>
      </Card>

      {positions.map((position) => (
        <button
          key={position.product_id}
          onClick={() => onOpen(position.product_id)}
          className="text-left bg-slate-800/80 shadow-lg shadow-slate-900/50 rounded-lg p-4
                     transition-shadow duration-500 hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="text-slate-100 font-medium">{position.product}</span>
            <span className="text-lg shrink-0">
              <Pnl value={position.pnl} />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <SideBadge side={position.side} />
            {position.price !== null && <span>at {num(position.price)}</span>}
            <span>
              mark {num(position.mark)}
              {position.phase !== 'SETTLED' && position.mark !== null && ' (running)'}
            </span>
            <span>{money(position.unit_value)} per unit</span>
            <PhaseBadge phase={position.phase} />
          </div>
        </button>
      ))}

      <p className="text-xs text-slate-500 px-1">
        P&amp;L marks against the running tally until a market settles. Tap a position to open it.
      </p>
    </div>
  );
};
