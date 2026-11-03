
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using server.Api.Services;

namespace server.Api.Authorization;

public sealed class StoreAuthorizationHandler
    : AuthorizationHandler<StoreRoleRequirement>
{
    private readonly StoreRoleService _roleService;

    public StoreAuthorizationHandler(StoreRoleService roleService)
    {
        _roleService = roleService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        StoreRoleRequirement requirement)
    {
        var firebaseUid = context.User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return;
        }

        var role = await _roleService.GetRoleAsync(firebaseUid);

        if (string.IsNullOrWhiteSpace(role))
        {
            return;
        }

        if (requirement.AllowedRoles.Contains(
            role,
            StringComparer.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
        }
    }
}
