
using Npgsql;

namespace server.Api.Data;

public sealed class UserRoleRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public UserRoleRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<string?> GetActiveRoleAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT role
            FROM app_private.user_roles
            WHERE firebase_uid = @firebase_uid
              AND is_active = TRUE
            LIMIT 1;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "firebase_uid",
            firebaseUid);

        var result = await command.ExecuteScalarAsync(cancellationToken);

        return result as string;
    }
}
