
using Npgsql;
using server.Api.Models;

namespace server.Api.Data;

public sealed class ProductImageRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public ProductImageRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<IReadOnlyList<ProductImageRecord>> GetByProductIdAsync(
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id, product_id, telegram_file_id, telegram_chat_id,
                   telegram_message_id, content_type, file_size, sha256,
                   display_order, is_primary, file_name, created_at
            FROM app_private.product_images
            WHERE product_id = @product_id
            ORDER BY display_order ASC;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("product_id", productId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var images = new List<ProductImageRecord>();

        while (await reader.ReadAsync(cancellationToken))
            images.Add(MapImage(reader));

        return images;
    }

    public async Task<ProductImageRecord?> GetByIdAsync(
        Guid imageId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id, product_id, telegram_file_id, telegram_chat_id,
                   telegram_message_id, content_type, file_size, sha256,
                   display_order, is_primary, file_name, created_at
            FROM app_private.product_images
            WHERE id = @id;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", imageId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        return await reader.ReadAsync(cancellationToken)
            ? MapImage(reader)
            : null;
    }

    public async Task<ProductImageRecord?> GetPrimaryAsync(
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id, product_id, telegram_file_id, telegram_chat_id,
                   telegram_message_id, content_type, file_size, sha256,
                   display_order, is_primary, file_name, created_at
            FROM app_private.product_images
            WHERE product_id = @product_id
              AND is_primary = TRUE
            LIMIT 1;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("product_id", productId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        return await reader.ReadAsync(cancellationToken)
            ? MapImage(reader)
            : null;
    }

    public async Task<ProductImageRecord> AddAsync(
        Guid productId,
        string telegramFileId,
        string telegramChatId,
        long telegramMessageId,
        string contentType,
        long fileSize,
        string sha256,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        var productExists = await LockProductAsync(
            connection, transaction, productId, cancellationToken);

        if (!productExists)
            throw new KeyNotFoundException("Product not found.");

        const string countSql = """
            SELECT COUNT(*)
            FROM app_private.product_images
            WHERE product_id = @product_id;
            """;

        int imageCount;

        await using (var countCommand =
            new NpgsqlCommand(countSql, connection, transaction))
        {
            countCommand.Parameters.AddWithValue("product_id", productId);

            imageCount = Convert.ToInt32(
                await countCommand.ExecuteScalarAsync(cancellationToken));
        }

        if (imageCount >= 10)
            throw new InvalidOperationException(
                "A product cannot have more than 10 images.");

        const string insertSql = """
            INSERT INTO app_private.product_images (
                product_id, telegram_file_id, telegram_chat_id,
                telegram_message_id, content_type, file_size, sha256,
                display_order, is_primary, file_name
            )
            VALUES (
                @product_id, @telegram_file_id, @telegram_chat_id,
                @telegram_message_id, @content_type, @file_size, @sha256,
                @display_order, @is_primary, @file_name
            )
            RETURNING id, product_id, telegram_file_id, telegram_chat_id,
                      telegram_message_id, content_type, file_size, sha256,
                      display_order, is_primary, file_name, created_at;
            """;

        await using var insertCommand =
            new NpgsqlCommand(insertSql, connection, transaction);

        insertCommand.Parameters.AddWithValue("product_id", productId);
        insertCommand.Parameters.AddWithValue("telegram_file_id", telegramFileId);
        insertCommand.Parameters.AddWithValue("telegram_chat_id", telegramChatId);
        insertCommand.Parameters.AddWithValue("telegram_message_id", telegramMessageId);
        insertCommand.Parameters.AddWithValue("content_type", contentType);
        insertCommand.Parameters.AddWithValue("file_size", fileSize);
        insertCommand.Parameters.AddWithValue("sha256", sha256);
        insertCommand.Parameters.AddWithValue("display_order", imageCount);
        insertCommand.Parameters.AddWithValue("is_primary", imageCount == 0);
        insertCommand.Parameters.AddWithValue("file_name", fileName);

        ProductImageRecord image;

        await using (var reader =
            await insertCommand.ExecuteReaderAsync(cancellationToken))
        {
            await reader.ReadAsync(cancellationToken);
            image = MapImage(reader);
        }

        await transaction.CommitAsync(cancellationToken);
        return image;
    }

    public async Task<ProductImageRecord?> DeleteAsync(
        Guid productId,
        Guid imageId,
        CancellationToken cancellationToken = default)
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        if (!await LockProductAsync(
            connection, transaction, productId, cancellationToken))
        {
            return null;
        }

        var image = await GetImageInTransactionAsync(
            connection, transaction, productId, imageId, cancellationToken);

        if (image is null)
            return null;

        const string deleteSql = """
            DELETE FROM app_private.product_images
            WHERE id = @image_id
              AND product_id = @product_id;
            """;

        await using (var deleteCommand =
            new NpgsqlCommand(deleteSql, connection, transaction))
        {
            deleteCommand.Parameters.AddWithValue("image_id", imageId);
            deleteCommand.Parameters.AddWithValue("product_id", productId);
            await deleteCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        // Move remaining orders out of the way first to avoid collisions
        // with the unique (product_id, display_order) index.
        await ShiftOrdersOutOfRangeAsync(
            connection, transaction, productId, cancellationToken);

        await NormalizeDisplayOrdersAsync(
            connection, transaction, productId, cancellationToken);

        const string clearPrimarySql = """
            UPDATE app_private.product_images
            SET is_primary = FALSE
            WHERE product_id = @product_id;
            """;

        await using (var clearCommand =
            new NpgsqlCommand(clearPrimarySql, connection, transaction))
        {
            clearCommand.Parameters.AddWithValue("product_id", productId);
            await clearCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        const string setPrimarySql = """
            UPDATE app_private.product_images
            SET is_primary = TRUE
            WHERE id = (
                SELECT id
                FROM app_private.product_images
                WHERE product_id = @product_id
                ORDER BY display_order ASC
                LIMIT 1
            );
            """;

        await using (var primaryCommand =
            new NpgsqlCommand(setPrimarySql, connection, transaction))
        {
            primaryCommand.Parameters.AddWithValue("product_id", productId);
            await primaryCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return image;
    }

    public async Task<bool> SetPrimaryAsync(
        Guid productId,
        Guid imageId,
        CancellationToken cancellationToken = default)
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        if (!await LockProductAsync(
            connection, transaction, productId, cancellationToken))
        {
            return false;
        }

        var image = await GetImageInTransactionAsync(
            connection, transaction, productId, imageId, cancellationToken);

        if (image is null)
            return false;

        const string clearSql = """
            UPDATE app_private.product_images
            SET is_primary = FALSE
            WHERE product_id = @product_id;
            """;

        await using (var clearCommand =
            new NpgsqlCommand(clearSql, connection, transaction))
        {
            clearCommand.Parameters.AddWithValue("product_id", productId);
            await clearCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        const string setSql = """
            UPDATE app_private.product_images
            SET is_primary = TRUE
            WHERE id = @image_id
              AND product_id = @product_id;
            """;

        await using (var setCommand =
            new NpgsqlCommand(setSql, connection, transaction))
        {
            setCommand.Parameters.AddWithValue("image_id", imageId);
            setCommand.Parameters.AddWithValue("product_id", productId);
            await setCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ReorderAsync(
        Guid productId,
        IReadOnlyList<Guid> imageIds,
        CancellationToken cancellationToken = default)
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        if (!await LockProductAsync(
            connection, transaction, productId, cancellationToken))
        {
            return false;
        }

        var currentImages = await GetImagesInTransactionAsync(
            connection, transaction, productId, cancellationToken);

        if (imageIds.Count != currentImages.Count ||
            imageIds.Distinct().Count() != imageIds.Count ||
            !imageIds.ToHashSet().SetEquals(currentImages.Select(x => x.Id)))
        {
            throw new InvalidOperationException(
                "The reorder request must include every product image exactly once.");
        }

        await ShiftOrdersOutOfRangeAsync(
            connection, transaction, productId, cancellationToken);

        const string updateSql = """
            UPDATE app_private.product_images
            SET display_order = @display_order
            WHERE id = @image_id
              AND product_id = @product_id;
            """;

        for (var index = 0; index < imageIds.Count; index++)
        {
            await using var updateCommand =
                new NpgsqlCommand(updateSql, connection, transaction);

            updateCommand.Parameters.AddWithValue("display_order", index);
            updateCommand.Parameters.AddWithValue("image_id", imageIds[index]);
            updateCommand.Parameters.AddWithValue("product_id", productId);

            await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    private static async Task<bool> LockProductAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid productId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id
            FROM app_private.products
            WHERE id = @product_id
            FOR UPDATE;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("product_id", productId);

        return await command.ExecuteScalarAsync(cancellationToken) is not null;
    }

    private static async Task<ProductImageRecord?> GetImageInTransactionAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid productId,
        Guid imageId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, product_id, telegram_file_id, telegram_chat_id,
                   telegram_message_id, content_type, file_size, sha256,
                   display_order, is_primary, file_name, created_at
            FROM app_private.product_images
            WHERE product_id = @product_id
              AND id = @image_id;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("product_id", productId);
        command.Parameters.AddWithValue("image_id", imageId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        return await reader.ReadAsync(cancellationToken)
            ? MapImage(reader)
            : null;
    }

    private static async Task<List<ProductImageRecord>> GetImagesInTransactionAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid productId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, product_id, telegram_file_id, telegram_chat_id,
                   telegram_message_id, content_type, file_size, sha256,
                   display_order, is_primary, file_name, created_at
            FROM app_private.product_images
            WHERE product_id = @product_id
            ORDER BY display_order ASC;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("product_id", productId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        var images = new List<ProductImageRecord>();

        while (await reader.ReadAsync(cancellationToken))
            images.Add(MapImage(reader));

        return images;
    }

    private static async Task ShiftOrdersOutOfRangeAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid productId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE app_private.product_images
            SET display_order = display_order + 100
            WHERE product_id = @product_id;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection, transaction);

        command.Parameters.AddWithValue("product_id", productId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task NormalizeDisplayOrdersAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid productId,
        CancellationToken cancellationToken)
    {
        var images = await GetImagesInTransactionAsync(
            connection, transaction, productId, cancellationToken);

        const string sql = """
            UPDATE app_private.product_images
            SET display_order = @display_order
            WHERE id = @image_id
              AND product_id = @product_id;
            """;

        for (var index = 0; index < images.Count; index++)
        {
            await using var command =
                new NpgsqlCommand(sql, connection, transaction);

            command.Parameters.AddWithValue("display_order", index);
            command.Parameters.AddWithValue("image_id", images[index].Id);
            command.Parameters.AddWithValue("product_id", productId);

            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static ProductImageRecord MapImage(NpgsqlDataReader reader)
    {
        return new ProductImageRecord(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetInt64(4),
            reader.GetString(5),
            reader.GetInt64(6),
            reader.GetString(7),
            reader.GetInt32(8),
            reader.GetBoolean(9),
            reader.IsDBNull(10) ? "image" : reader.GetString(10),
            reader.GetDateTime(11));
    }
}
