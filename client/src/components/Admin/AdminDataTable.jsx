export default function AdminDataTable({
  columns,
  data,
  renderRow,
  loadingState,
  errorState,
  emptyState,
}) {
  const columnCount = columns.length;

  return (
    <div className="ap-table-wrap">
      <table className="ap-product-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.label} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loadingState ? (
            <tr>
              <td colSpan={columnCount}>{loadingState}</td>
            </tr>
          ) : errorState ? (
            <tr>
              <td colSpan={columnCount} role="alert">{errorState}</td>
            </tr>
          ) : data.length ? (
            data.map((item, index) => (
              <tr key={item.id ?? index}>{renderRow(item)}</tr>
            ))
          ) : (
            <tr>
              <td colSpan={columnCount}>{emptyState}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}