import { MyPosition } from '../../types/exchange';
import { num, Pnl, PhaseBadge, SideBadge, tdClass, thClass } from './ui';

interface PositionsTableProps {
  positions: MyPosition[];
}

export const PositionsTable = ({ positions }: PositionsTableProps) => {
  if (positions.length === 0) {
    return (
      <p className="text-sm text-slate-500 px-4 py-6 text-center">
        No positions yet. Join a product below to get started.
      </p>
    );
  }

  const total = positions.reduce((sum, p) => sum + (p.pnl ?? 0), 0);
  const anyMarked = positions.some((p) => p.pnl !== null);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-700">
          <tr>
            <th className={thClass}>Product</th>
            <th className={thClass}>Side</th>
            <th className={`${thClass} text-right hidden sm:table-cell`}>Price</th>
            <th className={`${thClass} text-right hidden sm:table-cell`}>Mark</th>
            <th className={`${thClass} text-right`}>P&amp;L</th>
            <th className={`${thClass} hidden md:table-cell`}>Status</th>
          </tr>
        </thead>
        <tbody className="bg-slate-800 divide-y divide-slate-700">
          {positions.map((position) => (
            <tr key={position.product_id} className="hover:bg-slate-700">
              <td className={`${tdClass} font-medium whitespace-normal`}>{position.product}</td>
              <td className={tdClass}>
                <SideBadge side={position.side} />
              </td>
              <td className={`${tdClass} text-right hidden sm:table-cell`}>{num(position.price)}</td>
              <td className={`${tdClass} text-right hidden sm:table-cell`}>{num(position.mark)}</td>
              <td className={`${tdClass} text-right`}>
                <Pnl value={position.pnl} />
              </td>
              <td className={`${tdClass} hidden md:table-cell`}>
                <PhaseBadge phase={position.phase} />
              </td>
            </tr>
          ))}
        </tbody>
        {anyMarked && (
          <tfoot className="bg-slate-800 border-t-2 border-slate-600">
            <tr>
              <td className={`${tdClass} font-medium text-slate-400`} colSpan={4}>
                Total
              </td>
              <td className={`${tdClass} text-right`}>
                <Pnl value={total} />
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
      <p className="px-4 py-2 text-xs text-slate-500">
        P&amp;L marks against the running tally until a product settles.
      </p>
    </div>
  );
};
