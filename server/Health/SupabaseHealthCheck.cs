using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;

namespace server.Api.Health;

public sealed class SupabaseHealthCheck : IHealthCheck
{
    private readonly NpgsqlDataSource _dataSource;

    public SupabaseHealthCheck(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var connection =
                await _dataSource.OpenConnectionAsync(cancellationToken);
            await using var command = new NpgsqlCommand("SELECT 1;", connection);

            await command.ExecuteScalarAsync(cancellationToken);

            return HealthCheckResult.Healthy();
        }
        catch
        {
            return HealthCheckResult.Unhealthy(
                "The database is unavailable.");
        }
    }
}