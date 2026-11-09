import "./AdminDataTable.css";

export default function AdminDataTable({
  columns = [],
  data = [],
  renderRow,
  getRowKey,
  className = "",
  tableClassName = "",
  loadingState,
  errorState,
  emptyState = "No records found.",
}) {
  const columnCount = columns.length;

  return (
    <div className={`admin-data-table-wrap ${className}`.trim()}>
      <table
        className={`admin-data-table ${tableClassName}`.trim()}
        aria-busy={Boolean(loadingState)}
      >
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.key ?? column.label} scope="col">
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
              <td colSpan={columnCount} role="alert" className="admin-data-table-state admin-data-table-error">
                {errorState}
              </td>
            </tr>
          ) : data.length ? (
            data.map((item, index) => (
              <tr key={getRowKey?.(item) ?? item?.id ?? index}>
                {renderRow
                  ? renderRow(item)
                  : columns.map((column) => (
                      <td className={column.className} key={column.key ?? column.label}>
                        {column.renderCell
                          ? column.renderCell(item)
                          : item?.[column.key]}
                      </td>
                    ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columnCount} className="admin-data-table-state">
                {emptyState}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}