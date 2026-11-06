
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Data;

namespace server.Api.Controllers;

[ApiController]
[Route("api/admin/inventory")]
[Authorize(Policy = "OwnerOrAdmin")]
public sealed class AdminInventoryController : ControllerBase
{
    private readonly InventoryRepository _repository;

    public AdminInventoryController(InventoryRepository repository)
    {
        _repository = repository;
    }

    // GET: /api/admin/inventory
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminInventoryRecord>>> GetAll(
        CancellationToken cancellationToken)
    {
        var inventory = await _repository.GetAllAsync(cancellationToken);

        return Ok(inventory);
    }

    // GET: /api/admin/inventory/summary
    [HttpGet("summary")]
    public async Task<ActionResult<AdminInventorySummary>> GetSummary(
        CancellationToken cancellationToken)
    {
        var summary = await _repository.GetSummaryAsync(cancellationToken);

        return Ok(summary);
    }
}
