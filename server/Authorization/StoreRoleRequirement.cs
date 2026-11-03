
using Microsoft.AspNetCore.Authorization;

namespace server.Api.Authorization;

public sealed class StoreRoleRequirement : IAuthorizationRequirement
{
    public IReadOnlyCollection<string> AllowedRoles { get; }

    public StoreRoleRequirement(params string[] allowedRoles)
    {
        AllowedRoles = allowedRoles ?? Array.Empty<string>();
    }
}
