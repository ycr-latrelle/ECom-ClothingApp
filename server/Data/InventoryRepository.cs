
using Npgsql;
using NpgsqlTypes;

namespace server.Api.Data;

public sealed class InventoryRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public InventoryRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    // --------------------------------------------------
    // ADMIN INVENTORY: LIST VARIANTS
    // --------------------------------------------------

    public async Task<IReadOnlyList<AdminInventoryRecord>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                p.id AS product_id,
                p.name AS product_name,
                pi.id AS inventory_id,
                pi.color,
                pi.size,
                pi.sku,
                pi.on_hand_quantity,
                pi.reserved_quantity,
                pi.available_quantity,
                pi.low_stock_threshold,
                pi.updated_at
            FROM app_private.products p
            LEFT JOIN app_private.product_inventory pi
                ON pi.product_id = p.id
            ORDER BY
                p.created_at DESC,
                p.name,
                pi.color NULLS FIRST,
                pi.size NULLS FIRST;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var records = new List<AdminInventoryRecord>();

        while (await reader.ReadAsync(cancellationToken))
        {
            records.Add(new AdminInventoryRecord(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetGuid(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.IsDBNull(6) ? 0 : reader.GetInt32(6),
                reader.IsDBNull(7) ? 0 : reader.GetInt32(7),
                reader.IsDBNull(8) ? 0 : reader.GetInt32(8),
                reader.IsDBNull(9) ? null : reader.GetInt32(9),
                reader.IsDBNull(10) ? null : reader.GetDateTime(10)));
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

                    COALESCE(
                        SUM(pi.available_quantity),
                        0
                    )::integer AS available_stock,

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
                COALESCE(
                    SUM(available_stock),
                    0
                )::integer AS total_stock_units,

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

        await using var command = new NpgsqlCommand(sql, connection);

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

    // --------------------------------------------------
    // ADMIN INVENTORY: SET VARIANT STOCK
    // --------------------------------------------------

    public async Task<AdminInventoryRecord?> SetStockAsync(
        SetVariantStockRequest request,
        string changedBy,
        CancellationToken cancellationToken = default)
    {
        if (request.ProductId == Guid.Empty)
        {
            throw new InventoryValidationException(
                "A valid product ID is required.");
        }

        if (request.Stock < 0)
        {
            throw new InventoryValidationException(
                "Stock quantity cannot be negative.");
        }

        if (request.LowStockThreshold is < 0)
        {
            throw new InventoryValidationException(
                "Low-stock threshold cannot be negative.");
        }

        var requestedColor = string.IsNullOrWhiteSpace(request.Color)
            ? null
            : request.Color.Trim();

        var requestedSize = string.IsNullOrWhiteSpace(request.Size)
            ? null
            : request.Size.Trim();

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        // --------------------------------------------------
        // LOCK AND LOAD PRODUCT
        // --------------------------------------------------

        const string getProductSql = """
            SELECT name, colors, sizes
            FROM app_private.products
            WHERE id = @product_id
            FOR UPDATE;
            """;

        string productName;
        string[] productColors;
        string[] productSizes;

        await using (var productCommand = new NpgsqlCommand(
            getProductSql,
            connection,
            transaction))
        {
            productCommand.Parameters.AddWithValue(
                "product_id",
                request.ProductId);

            await using var reader =
                await productCommand.ExecuteReaderAsync(cancellationToken);

            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            productName = reader.GetString(0);

            productColors = reader.GetFieldValue<string[]>(1);
            productSizes = reader.GetFieldValue<string[]>(2);
        }

        // --------------------------------------------------
        // VALIDATE AND NORMALIZE COLOR
        // --------------------------------------------------

        string? color = null;

        if (productColors.Length == 0)
        {
            if (requestedColor is not null)
            {
                throw new InventoryValidationException(
                    $"{productName} does not have selectable colors.");
            }
        }
        else
        {
            if (requestedColor is null)
            {
                throw new InventoryValidationException(
                    $"Choose a valid color for {productName}.");
            }

            color = productColors.FirstOrDefault(
                existingColor => string.Equals(
                    existingColor.Trim(),
                    requestedColor,
                    StringComparison.OrdinalIgnoreCase));

            if (color is null)
            {
                throw new InventoryValidationException(
                    $"Choose a valid color for {productName}.");
            }

            color = color.Trim();
        }

        // --------------------------------------------------
        // VALIDATE AND NORMALIZE SIZE
        // --------------------------------------------------

        string? size = null;

        if (productSizes.Length == 0)
        {
            if (requestedSize is not null)
            {
                throw new InventoryValidationException(
                    $"{productName} does not have selectable sizes.");
            }
        }
        else
        {
            if (requestedSize is null)
            {
                throw new InventoryValidationException(
                    $"Choose a valid size for {productName}.");
            }

            size = productSizes.FirstOrDefault(
                existingSize => string.Equals(
                    existingSize.Trim(),
                    requestedSize,
                    StringComparison.OrdinalIgnoreCase));

            if (size is null)
            {
                throw new InventoryValidationException(
                    $"Choose a valid size for {productName}.");
            }

            size = size.Trim().ToUpperInvariant();
        }

        // --------------------------------------------------
        // FIND AND LOCK EXACT INVENTORY VARIANT
        // --------------------------------------------------

        const string getVariantSql = """
            SELECT
                id,
                sku,
                on_hand_quantity,
                reserved_quantity
            FROM app_private.product_inventory
            WHERE product_id = @product_id
              AND lower(COALESCE(color, '')) =
                  lower(COALESCE(@color, ''))
              AND size IS NOT DISTINCT FROM @size
            FOR UPDATE;
            """;

        Guid? inventoryId = null;
        string? sku = null;
        var previousStock = 0;
        var reservedQuantity = 0;

        await using (var variantCommand = new NpgsqlCommand(
            getVariantSql,
            connection,
            transaction))
        {
            variantCommand.Parameters.AddWithValue(
                "product_id",
                request.ProductId);

            variantCommand.Parameters.Add(
                "color",
                NpgsqlDbType.Text).Value =
                (object?)color ?? DBNull.Value;

            variantCommand.Parameters.Add(
                "size",
                NpgsqlDbType.Text).Value =
                (object?)size ?? DBNull.Value;

            await using var reader =
                await variantCommand.ExecuteReaderAsync(cancellationToken);

            if (await reader.ReadAsync(cancellationToken))
            {
                inventoryId = reader.GetGuid(0);
                sku = reader.IsDBNull(1)
                    ? null
                    : reader.GetString(1);

                previousStock = reader.GetInt32(2);
                reservedQuantity = reader.GetInt32(3);
            }
        }

        // Never reduce physical stock below reserved stock.
        if (request.Stock < reservedQuantity)
        {
            throw new InventoryValidationException(
                $"Stock cannot be lower than the {reservedQuantity} units currently reserved.");
        }

        var stockDelta = request.Stock - previousStock;
        var updatedAt = DateTimeOffset.UtcNow;

        // --------------------------------------------------
        // UPDATE EXISTING VARIANT
        // --------------------------------------------------

        if (inventoryId.HasValue)
        {
            const string updateVariantSql = """
                UPDATE app_private.product_inventory
                SET
                    on_hand_quantity = @stock,
                    low_stock_threshold = @low_stock_threshold,
                    updated_at = @updated_at
                WHERE id = @inventory_id;
                """;

            await using var updateCommand = new NpgsqlCommand(
                updateVariantSql,
                connection,
                transaction);

            updateCommand.Parameters.AddWithValue(
                "stock",
                request.Stock);

            updateCommand.Parameters.Add(
                "low_stock_threshold",
                NpgsqlDbType.Integer).Value =
                (object?)request.LowStockThreshold ?? DBNull.Value;

            updateCommand.Parameters.AddWithValue(
                "updated_at",
                updatedAt);

            updateCommand.Parameters.AddWithValue(
                "inventory_id",
                inventoryId.Value);

            await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        }
        else
        {
            // --------------------------------------------------
            // INSERT NEW VARIANT
            // --------------------------------------------------

            const string insertVariantSql = """
                INSERT INTO app_private.product_inventory (
                    product_id,
                    color,
                    size,
                    on_hand_quantity,
                    reserved_quantity,
                    low_stock_threshold,
                    created_at,
                    updated_at
                )
                VALUES (
                    @product_id,
                    @color,
                    @size,
                    @stock,
                    0,
                    @low_stock_threshold,
                    @updated_at,
                    @updated_at
                )
                RETURNING id;
                """;

            await using var insertCommand = new NpgsqlCommand(
                insertVariantSql,
                connection,
                transaction);

            insertCommand.Parameters.AddWithValue(
                "product_id",
                request.ProductId);

            insertCommand.Parameters.Add(
                "color",
                NpgsqlDbType.Text).Value =
                (object?)color ?? DBNull.Value;

            insertCommand.Parameters.Add(
                "size",
                NpgsqlDbType.Text).Value =
                (object?)size ?? DBNull.Value;

            insertCommand.Parameters.AddWithValue(
                "stock",
                request.Stock);

            insertCommand.Parameters.Add(
                "low_stock_threshold",
                NpgsqlDbType.Integer).Value =
                (object?)request.LowStockThreshold ?? DBNull.Value;

            insertCommand.Parameters.AddWithValue(
                "updated_at",
                updatedAt);

            var result = await insertCommand.ExecuteScalarAsync(
                cancellationToken);

            inventoryId = (Guid)result!;
        }

        // --------------------------------------------------
        // RECORD STOCK MOVEMENT
        // --------------------------------------------------

        // Do not insert a movement when the physical stock
        // quantity has not changed.
        if (stockDelta != 0)
        {
            const string insertMovementSql = """
                INSERT INTO app_private.inventory_movements (
                    inventory_id,
                    product_id,
                    reservation_id,
                    order_id,
                    order_item_id,
                    movement_type,
                    on_hand_delta,
                    reserved_delta,
                    note,
                    changed_by,
                    created_at
                )
                VALUES (
                    @inventory_id,
                    @product_id,
                    NULL,
                    NULL,
                    NULL,
                    'stock_adjusted',
                    @on_hand_delta,
                    0,
                    @note,
                    @changed_by,
                    @created_at
                );
                """;

            await using var movementCommand = new NpgsqlCommand(
                insertMovementSql,
                connection,
                transaction);

            movementCommand.Parameters.AddWithValue(
                "inventory_id",
                inventoryId!.Value);

            movementCommand.Parameters.AddWithValue(
                "product_id",
                request.ProductId);

            movementCommand.Parameters.AddWithValue(
                "on_hand_delta",
                stockDelta);

            movementCommand.Parameters.AddWithValue(
                "note",
                $"Manual stock adjustment for {productName}" +
                $" (Color: {color ?? "N/A"}, Size: {size ?? "N/A"}). " +
                $"Stock changed from {previousStock} to {request.Stock}.");

            movementCommand.Parameters.AddWithValue(
                "changed_by",
                string.IsNullOrWhiteSpace(changedBy)
                    ? "admin"
                    : changedBy);

            movementCommand.Parameters.AddWithValue(
                "created_at",
                updatedAt);

            await movementCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        // --------------------------------------------------
        // COMMIT TRANSACTION
        // --------------------------------------------------

        await transaction.CommitAsync(cancellationToken);

        return new AdminInventoryRecord(
            request.ProductId,
            productName,
            inventoryId,
            color,
            size,
            sku,
            request.Stock,
            reservedQuantity,
            request.Stock - reservedQuantity,
            request.LowStockThreshold,
            updatedAt.UtcDateTime);
    }
}

// --------------------------------------------------
// REQUEST AND RESPONSE MODELS
// --------------------------------------------------

public sealed record SetVariantStockRequest(
    Guid ProductId,
    string? Color,
    string? Size,
    int Stock,
    int? LowStockThreshold);

public sealed record AdminInventoryRecord(
    Guid ProductId,
    string ProductName,
    Guid? InventoryId,
    string? Color,
    string? Size,
    string? Sku,
    int OnHandQuantity,
    int ReservedQuantity,
    int AvailableQuantity,
    int? LowStockThreshold,
    DateTime? UpdatedAt);

public sealed record AdminInventorySummary(
    int TotalStockUnits,
    int LowStockProducts,
    int OutOfStockProducts);

public sealed class InventoryValidationException : Exception
{
    public InventoryValidationException(string message) : base(message)
    {
    }
}
