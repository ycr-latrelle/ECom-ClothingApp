
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Services;

namespace server.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public sealed class AdminAccessController : ControllerBase
{
    private readonly StoreRoleService _roleService;

    public AdminAccessController(StoreRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet("access")]
    [ResponseCache(
        NoStore = true,
        Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetAccess(
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return Unauthorized();
        }

        var role = await _roleService.GetRoleAsync(
            firebaseUid,
            cancellationToken);

        Response.Headers["Cache-Control"] =
            "no-store, no-cache, must-revalidate";

        var isOwner = role == "owner";
        var isAdmin = isOwner || role == "admin";

        return Ok(new
        {
            role = role ?? "customer",
            isAdmin,
            isOwner,
            isSeller = role == "seller",
            canManageRoles = isOwner
        });
    }
}
