using server.Api.Data;

namespace server.Api.Services;

public sealed class StoreRoleService
{
    private readonly UserRoleRepository _repository;
    private readonly IConfiguration _configuration;

    public StoreRoleService(
        UserRoleRepository repository,
        IConfiguration configuration)
    {
        _repository = repository;
        _configuration = configuration;
    }

    public async Task<string?> GetRoleAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default)
    {
        var ownerFirebaseUid =
            _configuration["Firebase:OwnerFirebaseUid"];

        // Owner is configured through backend configuration.
        if (!string.IsNullOrWhiteSpace(ownerFirebaseUid) &&
            string.Equals(
                firebaseUid,
                ownerFirebaseUid,
                StringComparison.Ordinal))
        {
            return "owner";
        }

        return await _repository.GetActiveRoleAsync(
            firebaseUid,
            cancellationToken);
    }
}