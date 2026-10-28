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
}