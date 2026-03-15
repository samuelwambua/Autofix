import Spinner from './Spinner';

const DataTable = ({ columns, data, loading, emptyMessage = 'No records found.' }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="md" text="Loading..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-white/40 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop Table (md+) ───────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-white/50 text-xs font-semibold uppercase
                    tracking-wider px-4 py-3 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-white/5 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-white/80">
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards (< md) ───────────────────────── */}
      <div className="md:hidden space-y-3">
        {data.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-2"
          >
            {columns.map((col) => {
              // Skip the actions column label on mobile — render it full width at the bottom
              const isActions = col.key === 'actions' || col.label?.toLowerCase() === 'actions';
              if (isActions) return null;
              return (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <span className="text-white/40 text-xs font-semibold uppercase tracking-wide flex-shrink-0">
                    {col.label}
                  </span>
                  <span className="text-white text-xs text-right">
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </span>
                </div>
              );
            })}
            {/* Render actions row at the bottom */}
            {columns.filter(c => c.key === 'actions' || c.label?.toLowerCase() === 'actions').map(col => (
              <div key={col.key} className="pt-2 border-t border-white/10 flex justify-end">
                {col.render ? col.render(row[col.key], row) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default DataTable;