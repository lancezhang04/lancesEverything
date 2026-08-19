import { playerTotals } from '../../data/sessions';
import { PositionRow } from '../../types/exchange';
import { Card, Pnl, tdClass, thClass } from './ui';

interface LeaderboardProps {
  products: { positions: PositionRow[] }[];
  /** Highlighted row, when the viewer is one of the players. */
  me?: string;
}

/** Standings across every market in the session, live or archived. */
export const Leaderboard = ({ products, me }: LeaderboardProps) => {
  const totals = playerTotals(products);

  if (totals.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-500">
          Nobody has taken a position yet — the board fills in as markets trade.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-700">
            <tr>
              <th className={thClass}>Player</th>
              <th className={`${thClass} text-right`}>P&amp;L</th>
              <th className={`${thClass} text-right hidden sm:table-cell`}>Traded</th>
              <th className={`${thClass} text-right hidden sm:table-cell`}>Made</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800 divide-y divide-slate-700">
            {totals.map((row, index) => (
              <tr
                key={row.user}
                className={row.user === me ? 'bg-slate-700/40' : 'hover:bg-slate-700'}
              >
                <td className={`${tdClass} font-medium`}>
                  <span className="text-slate-600 mr-2">{index + 1}</span>
                  {row.user}
                  {row.user === me && <span className="text-xs text-slate-500 ml-2">you</span>}
                </td>
                <td className={`${tdClass} text-right`}>
                  <Pnl value={row.pnl} />
                </td>
                <td className={`${tdClass} text-right hidden sm:table-cell`}>{row.traded}</td>
                <td className={`${tdClass} text-right hidden sm:table-cell`}>{row.made}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
