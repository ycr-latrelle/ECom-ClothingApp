using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Data;
using server.Api.Models;

namespace server.Api.Controllers;

[ApiController]
[Route("api/me/profile")]
[Authorize]
public sealed class CustomerProfilesController : ControllerBase
{
    private readonly CustomerProfileRepository _repository;

    public CustomerProfilesController(CustomerProfileRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<CustomerProfileRequest>> Get(
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return Unauthorized();
        }

        var profile = await _repository.GetByFirebaseUidAsync(
            firebaseUid,
            cancellationToken);

        if (profile is null)
        {
            return NotFound();
        }

        return Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> Save(
        [FromBody] CustomerProfileRequest request,
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return Unauthorized();
        }

        await _repository.SaveAsync(firebaseUid, request, cancellationToken);

        return NoContent();
    }
}