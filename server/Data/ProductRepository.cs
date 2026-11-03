
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
            SELECT id, slug, name, price, image_path, category, status, sizes
            FROM app_private.products
            WHERE is_active = TRUE
            ORDER BY name;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var products = new List<ProductResponse>();

        while (await reader.ReadAsync(cancellationToken))
        {
            products.Add(new ProductResponse(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetDecimal(3),
                reader.GetString(4),
                reader.GetString(5),
                reader.GetString(6),
                reader.GetFieldValue<string[]>(7)));
        }

        return products;
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
        CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();

        // This endpoint will be implemented in the image-storage stage.
        // Keeping the path stable means the product record does not need
        // another update when its first image is uploaded.
        var imagePath = $"/api/products/{id}/images/primary";

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
                is_active,
                is_mock;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("slug", NormalizeSlug(request.Slug));
        command.Parameters.AddWithValue("name", request.Name.Trim());
        command.Parameters.AddWithValue("price", request.Price);
        command.Parameters.AddWithValue("image_path", imagePath);
        command.Parameters.AddWithValue("category", request.Category);
        command.Parameters.AddWithValue("status", request.Status);
        command.Parameters.AddWithValue("sizes", NormalizeSizes(request.Sizes));
        command.Parameters.AddWithValue("is_active", request.IsActive);
        command.Parameters.AddWithValue("is_mock", request.IsMock);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        await reader.ReadAsync(cancellationToken);

        return MapAdminProduct(reader);
    }

    public async Task<AdminProductResponse?> UpdateAsync(
        Guid id,
        ProductUpsertRequest request,
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
                is_active,
                is_mock;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("slug", NormalizeSlug(request.Slug));
        command.Parameters.AddWithValue("name", request.Name.Trim());
        command.Parameters.AddWithValue("price", request.Price);
        command.Parameters.AddWithValue("category", request.Category);
        command.Parameters.AddWithValue("status", request.Status);
        command.Parameters.AddWithValue("sizes", NormalizeSizes(request.Sizes));
        command.Parameters.AddWithValue("is_active", request.IsActive);
        command.Parameters.AddWithValue("is_mock", request.IsMock);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapAdminProduct(reader);
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
            reader.GetBoolean(8),
            reader.GetBoolean(9));
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
}
