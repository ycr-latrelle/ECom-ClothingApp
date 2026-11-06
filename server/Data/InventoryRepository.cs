
using Npgsql;

namespace server.Api.Data;

public sealed class InventoryRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public InventoryRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    // --------------------------------------------------
    // ADMIN INVENTORY
    // --------------------------------------------------

    public async Task<IReadOnlyList<AdminInventoryRecord>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                p.id AS product_id,
                COALESCE(SUM(pi.available_quantity), 0)::integer
                    AS available_stock,

                CASE
                    WHEN COUNT(pi.id) = 1
                    THEN MAX(pi.sku)
                    ELSE NULL
                END AS sku,

                CASE
                    WHEN COUNT(pi.id) > 0
                     AND COUNT(pi.low_stock_threshold) = COUNT(pi.id)
                    THEN SUM(pi.low_stock_threshold)::integer
                    ELSE NULL
                END AS low_stock_threshold,

                MAX(pi.updated_at) AS updated_at

            FROM app_private.products p

            LEFT JOIN app_private.product_inventory pi
                ON pi.product_id = p.id

            GROUP BY p.id
            ORDER BY p.created_at DESC, p.name;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command =
            new NpgsqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var records = new List<AdminInventoryRecord>();

        while (await reader.ReadAsync(cancellationToken))
        {
            records.Add(new AdminInventoryRecord(
                reader.GetGuid(0),
                reader.GetInt32(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetInt32(3),
                reader.IsDBNull(4) ? null : reader.GetDateTime(4)));
        }

        return records;
    }

    // --------------------------------------------------
    // ADMIN INVENTORY SUMMARY
    // --------------------------------------------------

    public async Task<AdminInventorySummary> GetSummaryAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            WITH product_stock AS (
                SELECT
                    p.id AS product_id,
                    COALESCE(SUM(pi.available_quantity), 0)::integer
                        AS available_stock,

                    CASE
                        WHEN COUNT(pi.id) > 0
                         AND COUNT(pi.low_stock_threshold) = COUNT(pi.id)
                        THEN SUM(pi.low_stock_threshold)::integer
                        ELSE NULL
                    END AS low_stock_threshold

                FROM app_private.products p

                LEFT JOIN app_private.product_inventory pi
                    ON pi.product_id = p.id

                GROUP BY p.id
            )

            SELECT
                COALESCE(SUM(available_stock), 0)::integer
                    AS total_stock_units,

                COUNT(*) FILTER (
                    WHERE available_stock > 0
                      AND low_stock_threshold IS NOT NULL
                      AND available_stock <= low_stock_threshold
                )::integer AS low_stock_products,

                COUNT(*) FILTER (
                    WHERE available_stock = 0
                )::integer AS out_of_stock_products

            FROM product_stock;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command =
            new NpgsqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return new AdminInventorySummary(0, 0, 0);
        }

        return new AdminInventorySummary(
            reader.GetInt32(0),
            reader.GetInt32(1),
            reader.GetInt32(2));
    }
}

// --------------------------------------------------
// RESPONSE MODELS
// --------------------------------------------------

public sealed record AdminInventoryRecord(
    Guid ProductId,
    int Stock,
    string? Sku,
    int? LowStockThreshold,
    DateTime? UpdatedAt);

public sealed record AdminInventorySummary(
    int TotalStockUnits,
    int LowStockProducts,
    int OutOfStockProducts);
