
using Npgsql;
using server.Api.Models;

namespace server.Api.Data;

public sealed class ProductRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public ProductRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    // --------------------------------------------------
    // PUBLIC STOREFRONT
    // --------------------------------------------------

    public async Task<IReadOnlyList<ProductResponse>> GetActiveAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                p.id,
                p.slug,
                p.name,
                p.price,
                p.image_path,
                p.category,
                p.status,
                p.sizes,
                p.colors,
                pi.id,
                pi.color,
                pi.size,
                pi.on_hand_quantity - pi.reserved_quantity AS available_quantity
            FROM app_private.products p
            LEFT JOIN app_private.product_inventory pi
                ON pi.product_id = p.id
            WHERE p.is_active = TRUE
            ORDER BY p.name, pi.color NULLS FIRST, pi.size NULLS FIRST;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var productRows = new Dictionary<Guid, PublicProductBuilder>();

        while (await reader.ReadAsync(cancellationToken))
        {
            var id = reader.GetGuid(0);
            if (!productRows.TryGetValue(id, out var product))
            {
                product = new PublicProductBuilder(
                    id,
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetDecimal(3),
                    reader.GetString(4),
                    reader.GetString(5),
                    reader.GetString(6),
                    reader.GetFieldValue<string[]>(7),
                    reader.GetFieldValue<string[]>(8));
                productRows.Add(id, product);
            }

            if (product.IsPreorder)
            {
                continue;
            }

            if (reader.IsDBNull(9) ||
                reader.IsDBNull(12) ||
                reader.GetInt32(12) <= 0)
            {
                continue;
            }

            product.AvailableVariants.Add(new ProductVariantAvailabilityResponse(
                reader.IsDBNull(10) ? null : reader.GetString(10),
                reader.IsDBNull(11) ? null : reader.GetString(11),
                true));
        }

        return productRows.Values
            .Select(product => product.ToResponse())
            .ToArray();
    }

    // --------------------------------------------------
    // ADMIN PRODUCT MANAGEMENT
    // --------------------------------------------------

    public async Task<IReadOnlyList<AdminProductResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                id,
                slug,
                name,
                price,
                image_path,
                category,
                status,
                sizes,
                colors,
                is_active,
                is_mock
            FROM app_private.products
            ORDER BY created_at DESC, name;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var products = new List<AdminProductResponse>();

        while (await reader.ReadAsync(cancellationToken))
        {
            products.Add(MapAdminProduct(reader));
        }

        return products;
    }

    public async Task<AdminProductResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                id,
                slug,
                name,
                price,
                image_path,
                category,
                status,
                sizes,
                colors,
                is_active,
                is_mock
            FROM app_private.products
            WHERE id = @id;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("id", id);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapAdminProduct(reader);
    }

    public async Task<AdminProductResponse> CreateAsync(
        ProductUpsertRequest request,
        string createdBy,
        CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        var imagePath = $"/api/products/{id}/images/primary";
        var sizes = NormalizeSizes(request.Sizes);
        var colors = NormalizeColors(request.Colors);
        var initialStocks = NormalizeAndValidateInitialStocks(
            request.InitialStocks,
            colors,
            sizes);

        const string sql = """
            INSERT INTO app_private.products (
                id,
                slug,
                name,
                price,
                image_path,
                category,
                status,
                sizes,
                colors,
                is_active,
                is_mock,
                created_at,
                updated_at
            )
            VALUES (
                @id,
                @slug,
                @name,
                @price,
                @image_path,
                @category,
                @status,
                @sizes,
                @colors,
                @is_active,
                @is_mock,
                NOW(),
                NOW()
            )
            RETURNING
                id,
                slug,
                name,
                price,
                image_path,
                category,
                status,
                sizes,
                colors,
                is_active,
                is_mock;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Transaction = transaction;

        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("slug", NormalizeSlug(request.Slug));
        command.Parameters.AddWithValue("name", request.Name.Trim());
        command.Parameters.AddWithValue("price", request.Price);
        command.Parameters.AddWithValue("image_path", imagePath);
        command.Parameters.AddWithValue("category", request.Category);
        command.Parameters.AddWithValue("status", request.Status);
        command.Parameters.AddWithValue("sizes", sizes);
        command.Parameters.AddWithValue("colors", colors);
        command.Parameters.AddWithValue("is_active", request.IsActive);
        command.Parameters.AddWithValue("is_mock", request.IsMock);

        AdminProductResponse product;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            await reader.ReadAsync(cancellationToken);
            product = MapAdminProduct(reader);
        }

        await InsertStockVariantsAsync(
            connection,
            transaction,
            id,
            initialStocks,
            createdBy,
            "Initial stock recorded during product creation",
            cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return product;
    }

    private static void EnsureExistingVariantsRemain(
        string[] existingColors,
        string[] existingSizes,
        string[] updatedColors,
        string[] updatedSizes)
    {
        if (existingColors.Any(existing => !updatedColors.Contains(
                existing,
                StringComparer.OrdinalIgnoreCase)) ||
            existingSizes.Any(existing => !updatedSizes.Contains(
                existing,
                StringComparer.OrdinalIgnoreCase)))
        {
            throw new InventoryValidationException(
                "Existing colors and sizes cannot be removed because they may have inventory or order history. Add new options without removing existing ones.");
        }

        if ((long)updatedColors.Length * updatedSizes.Length > 100)
        {
            throw new InventoryValidationException(
                "A product cannot have more than 100 color-size combinations.");
        }
    }

    private static InitialProductStockRequest[] NormalizeAndValidateAddedStocks(
        InitialProductStockRequest[]? initialStocks,
        string[] existingColors,
        string[] existingSizes,
        string[] updatedColors,
        string[] updatedSizes)
    {
        var oldVariants = existingColors
            .SelectMany(color => existingSizes.Select(size => (Color: color, Size: size)))
            .ToHashSet(new VariantKeyComparer());
        var expectedNewVariants = updatedColors
            .SelectMany(color => updatedSizes.Select(size => (Color: color, Size: size)))
            .Where(variant => !oldVariants.Contains(variant))
            .ToHashSet(new VariantKeyComparer());
        var stocks = initialStocks ?? [];

        if (expectedNewVariants.Count == 0 && stocks.Length == 0)
        {
            return [];
        }

        var submittedVariants = new HashSet<(string Color, string Size)>(
            new VariantKeyComparer());
        var normalizedStocks = new List<InitialProductStockRequest>(stocks.Length);

        foreach (var stock in stocks)
        {
            var color = updatedColors.FirstOrDefault(value =>
                string.Equals(value, stock.Color?.Trim(), StringComparison.OrdinalIgnoreCase));
            var size = updatedSizes.FirstOrDefault(value =>
                string.Equals(value, stock.Size?.Trim(), StringComparison.OrdinalIgnoreCase));

            if (color is null || size is null)
            {
                throw new InventoryValidationException(
                    "New variant stock contains a color or size that is not defined for the product.");
            }

            if (stock.Stock < 0 || stock.LowStockThreshold < 0)
            {
                throw new InventoryValidationException(
                    "Stock and low-stock threshold must be non-negative whole numbers.");
            }

            var variant = (Color: color, Size: size);
            if (!expectedNewVariants.Contains(variant) ||
                !submittedVariants.Add(variant))
            {
                throw new InventoryValidationException(
                    "Stock can only be submitted once for each newly added color-size combination.");
            }

            normalizedStocks.Add(stock with
            {
                Color = color,
                Size = size
            });
        }

        if (!expectedNewVariants.SetEquals(submittedVariants))
        {
            throw new InventoryValidationException(
                "Enter a starting stock quantity for every newly added color-size combination.");
        }

        return normalizedStocks.ToArray();
    }

    private static async Task InsertStockVariantsAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid productId,
        InitialProductStockRequest[] stocks,
        string changedBy,
        string movementNote,
        CancellationToken cancellationToken)
    {
        foreach (var stock in stocks)
        {
            const string insertInventorySql = """
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
                    NOW(),
                    NOW()
                )
                RETURNING id;
                """;

            await using var inventoryCommand = new NpgsqlCommand(
                insertInventorySql,
                connection,
                transaction);

            inventoryCommand.Parameters.AddWithValue("product_id", productId);
            inventoryCommand.Parameters.AddWithValue("color", stock.Color);
            inventoryCommand.Parameters.AddWithValue("size", stock.Size);
            inventoryCommand.Parameters.AddWithValue("stock", stock.Stock);
            inventoryCommand.Parameters.AddWithValue(
                "low_stock_threshold",
                stock.LowStockThreshold);

            var inventoryId = (Guid)(await inventoryCommand.ExecuteScalarAsync(
                cancellationToken))!;

            if (stock.Stock == 0)
            {
                continue;
            }

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
                    @stock,
                    0,
                    @note,
                    @changed_by,
                    NOW()
                );
                """;

            await using var movementCommand = new NpgsqlCommand(
                insertMovementSql,
                connection,
                transaction);

            movementCommand.Parameters.AddWithValue("inventory_id", inventoryId);
            movementCommand.Parameters.AddWithValue("product_id", productId);
            movementCommand.Parameters.AddWithValue("stock", stock.Stock);
            movementCommand.Parameters.AddWithValue(
                "note",
                $"{movementNote} (Color: {stock.Color}, Size: {stock.Size}).");
            movementCommand.Parameters.AddWithValue(
                "changed_by",
                string.IsNullOrWhiteSpace(changedBy) ? "admin" : changedBy);

            await movementCommand.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    public async Task<AdminProductResponse?> UpdateAsync(
        Guid id,
        ProductUpsertRequest request,
        string changedBy,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE app_private.products
            SET
                slug = @slug,
                name = @name,
                price = @price,
                category = @category,
                status = @status,
                sizes = @sizes,
                colors = @colors,
                is_active = @is_active,
                is_mock = @is_mock,
                updated_at = NOW()
            WHERE id = @id
            RETURNING
                id,
                slug,
                name,
                price,
                image_path,
                category,
                status,
                sizes,
                colors,
                is_active,
                is_mock;
            """;

        var sizes = NormalizeSizes(request.Sizes);
        var colors = NormalizeColors(request.Colors);
        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        const string getExistingVariantsSql = """
            SELECT colors, sizes
            FROM app_private.products
            WHERE id = @id
            FOR UPDATE;
            """;

        string[] existingColors;
        string[] existingSizes;

        await using (var existingCommand = new NpgsqlCommand(
            getExistingVariantsSql,
            connection,
            transaction))
        {
            existingCommand.Parameters.AddWithValue("id", id);
            await using var reader =
                await existingCommand.ExecuteReaderAsync(cancellationToken);

            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            existingColors = reader.GetFieldValue<string[]>(0);
            existingSizes = reader.GetFieldValue<string[]>(1);
        }

        EnsureExistingVariantsRemain(existingColors, existingSizes, colors, sizes);
        var addedStocks = NormalizeAndValidateAddedStocks(
            request.InitialStocks,
            existingColors,
            existingSizes,
            colors,
            sizes);

        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("slug", NormalizeSlug(request.Slug));
        command.Parameters.AddWithValue("name", request.Name.Trim());
        command.Parameters.AddWithValue("price", request.Price);
        command.Parameters.AddWithValue("category", request.Category);
        command.Parameters.AddWithValue("status", request.Status);
        command.Parameters.AddWithValue("sizes", sizes);
        command.Parameters.AddWithValue("colors", colors);
        command.Parameters.AddWithValue("is_active", request.IsActive);
        command.Parameters.AddWithValue("is_mock", request.IsMock);

        AdminProductResponse product;
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            product = MapAdminProduct(reader);
        }

        await InsertStockVariantsAsync(
            connection,
            transaction,
            id,
            addedStocks,
            changedBy,
            "Stock recorded while adding a product variant",
            cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return product;
    }

    public async Task<bool> SetActiveAsync(
        Guid id,
        bool isActive,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE app_private.products
            SET
                is_active = @is_active,
                updated_at = NOW()
            WHERE id = @id;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("is_active", isActive);

        var affectedRows =
            await command.ExecuteNonQueryAsync(cancellationToken);

        return affectedRows > 0;
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM app_private.products
            WHERE id = @id;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("id", id);

        var affectedRows =
            await command.ExecuteNonQueryAsync(cancellationToken);

        return affectedRows > 0;
    }

    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------

    private static AdminProductResponse MapAdminProduct(
        NpgsqlDataReader reader)
    {
        return new AdminProductResponse(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetDecimal(3),
            reader.GetString(4),
            reader.GetString(5),
            reader.GetString(6),
            reader.GetFieldValue<string[]>(7),
            reader.GetFieldValue<string[]>(8),
            reader.GetBoolean(9),
            reader.GetBoolean(10));
    }

    private static string NormalizeSlug(string slug)
    {
        return slug.Trim().ToLowerInvariant();
    }

    private static string[] NormalizeSizes(string[]? sizes)
    {
        return (sizes ?? [])
            .Where(size => !string.IsNullOrWhiteSpace(size))
            .Select(size => size.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string[] NormalizeColors(string[]? colors)
    {
        return (colors ?? [])
            .Where(color => !string.IsNullOrWhiteSpace(color))
            .Select(color => color.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private sealed class PublicProductBuilder
    {
        private readonly Guid _id;
        private readonly string _slug;
        private readonly string _name;
        private readonly decimal _price;
        private readonly string _image;
        private readonly string _category;
        private readonly string _status;
        private readonly string[] _sizes;
        private readonly string[] _colors;

        public List<ProductVariantAvailabilityResponse> AvailableVariants { get; } = [];
        public bool IsPreorder => _status == "pre-order";

        public PublicProductBuilder(
            Guid id,
            string slug,
            string name,
            decimal price,
            string image,
            string category,
            string status,
            string[] sizes,
            string[] colors)
        {
            _id = id;
            _slug = slug;
            _name = name;
            _price = price;
            _image = image;
            _category = category;
            _status = status;
            _sizes = sizes;
            _colors = colors;
        }

        public ProductResponse ToResponse()
        {
            if (IsPreorder)
            {
                IEnumerable<string?> preorderColors = _colors.Length == 0
                    ? new string?[] { null }
                    : _colors.Select(color => (string?)color);
                IEnumerable<string?> preorderSizes = _sizes.Length == 0
                    ? new string?[] { null }
                    : _sizes.Select(size => (string?)size);
                var preorderVariants = preorderColors
                    .SelectMany(color => preorderSizes
                        .Select(size => new ProductVariantAvailabilityResponse(
                            color,
                            size,
                            true)))
                    .ToArray();

                return new ProductResponse(
                    _id,
                    _slug,
                    _name,
                    _price,
                    _image,
                    _category,
                    _status,
                    _sizes,
                    _colors,
                    true,
                    preorderVariants);
            }

            return new ProductResponse(
                _id,
                _slug,
                _name,
                _price,
                _image,
                _category,
                _status,
                _sizes,
                _colors,
                AvailableVariants.Count > 0,
                AvailableVariants.ToArray());
        }
    }

    private static InitialProductStockRequest[] NormalizeAndValidateInitialStocks(
        InitialProductStockRequest[]? initialStocks,
        string[] colors,
        string[] sizes)
    {
        var stocks = initialStocks ?? [];

        if (stocks.Length == 0)
        {
            return [];
        }

        if (colors.Length == 0 || sizes.Length == 0)
        {
            throw new InventoryValidationException(
                "Initial stock requires at least one color and one size.");
        }

        if ((long)colors.Length * sizes.Length > 100)
        {
            throw new InventoryValidationException(
                "A product cannot have more than 100 color-size combinations.");
        }

        var expectedVariants = colors
            .SelectMany(color => sizes.Select(size => (Color: color, Size: size)))
            .ToHashSet(new VariantKeyComparer());
        var normalizedStocks = new List<InitialProductStockRequest>(stocks.Length);
        var submittedVariants = new HashSet<(string Color, string Size)>(
            new VariantKeyComparer());

        foreach (var stock in stocks)
        {
            var color = colors.FirstOrDefault(value =>
                string.Equals(value, stock.Color?.Trim(), StringComparison.OrdinalIgnoreCase));
            var size = sizes.FirstOrDefault(value =>
                string.Equals(value, stock.Size?.Trim(), StringComparison.OrdinalIgnoreCase));

            if (color is null || size is null)
            {
                throw new InventoryValidationException(
                    "Initial stock contains a color or size that is not defined for the product.");
            }

            if (stock.Stock < 0 || stock.LowStockThreshold < 0)
            {
                throw new InventoryValidationException(
                    "Initial stock and low-stock threshold must be non-negative whole numbers.");
            }

            var variant = (Color: color, Size: size);
            if (!submittedVariants.Add(variant))
            {
                throw new InventoryValidationException(
                    "Initial stock contains a duplicate color-size combination.");
            }

            normalizedStocks.Add(stock with
            {
                Color = color,
                Size = size
            });
        }

        if (!expectedVariants.SetEquals(submittedVariants))
        {
            throw new InventoryValidationException(
                "Enter initial stock for every color-size combination.");
        }

        return normalizedStocks.ToArray();
    }

    private sealed class VariantKeyComparer :
        IEqualityComparer<(string Color, string Size)>
    {
        public bool Equals(
            (string Color, string Size) left,
            (string Color, string Size) right) =>
            string.Equals(left.Color, right.Color, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(left.Size, right.Size, StringComparison.OrdinalIgnoreCase);

        public int GetHashCode((string Color, string Size) value) =>
            HashCode.Combine(
                StringComparer.OrdinalIgnoreCase.GetHashCode(value.Color),
                StringComparer.OrdinalIgnoreCase.GetHashCode(value.Size));
    }
}
