
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Services;

namespace server.Api.Controllers;

[ApiController]
[Route("api/admin/access")]
[Authorize]
public sealed class AdminAccessController : ControllerBase
{
    private readonly StoreRoleService _roleService;

    public AdminAccessController(StoreRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAccess(
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return Unauthorized(new
            {
                error = "Unable to identify the authenticated user."
            });
        }

        var role = await _roleService.GetRoleAsync(
            firebaseUid,
            cancellationToken);

        var isOwner = string.Equals(
            role,
            "owner",
            StringComparison.OrdinalIgnoreCase);

        var isAdmin = isOwner || string.Equals(
            role,
            "admin",
            StringComparison.OrdinalIgnoreCase);

        return Ok(new
        {
            role,
            isAdmin,
            isOwner
        });
    }
}
