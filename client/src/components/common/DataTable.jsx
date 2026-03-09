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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left text-white/50 text-xs font-semibold uppercase tracking-wider px-4 py-3"
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
  );
};

export default DataTable;