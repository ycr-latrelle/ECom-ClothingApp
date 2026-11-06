
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using server.Api.Data;

namespace server.Api.Controllers;

[ApiController]
[Route("api/admin/inventory")]
[Authorize(Policy = "OwnerOrAdmin")]
public sealed class AdminInventoryController : ControllerBase
{
    private readonly InventoryRepository _repository;
    private readonly ILogger<AdminInventoryController> _logger;

    public AdminInventoryController(
        InventoryRepository repository,
        ILogger<AdminInventoryController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    // --------------------------------------------------
    // GET: /api/admin/inventory
    // Lists inventory records by product/color/size variant.
    // --------------------------------------------------

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminInventoryRecord>>> GetAll(
        CancellationToken cancellationToken)
    {
        var inventory = await _repository.GetAllAsync(
            cancellationToken);

        return Ok(inventory);
    }

    // --------------------------------------------------
    // GET: /api/admin/inventory/summary
    // --------------------------------------------------

    [HttpGet("summary")]
    public async Task<ActionResult<AdminInventorySummary>> GetSummary(
        CancellationToken cancellationToken)
    {
        var summary = await _repository.GetSummaryAsync(
            cancellationToken);

        return Ok(summary);
    }

    // --------------------------------------------------
    // PUT: /api/admin/inventory/stock
    // Sets the final on-hand quantity for one variant.
    // --------------------------------------------------

    [HttpPut("stock")]
    public async Task<ActionResult<AdminInventoryRecord>> SetStock(
        [FromBody] SetVariantStockRequest request,
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return Unauthorized(new
            {
                error = "Unable to identify the authenticated administrator."
            });
        }

        try
        {
            var inventory = await _repository.SetStockAsync(
                request,
                firebaseUid,
                cancellationToken);

            if (inventory is null)
            {
                return NotFound(new
                {
                    error = "Product not found."
                });
            }

            return Ok(inventory);
        }
        catch (InventoryValidationException exception)
        {
            return BadRequest(new
            {
                error = exception.Message
            });
        }
        catch (PostgresException exception)
            when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            _logger.LogWarning(
                exception,
                "Duplicate inventory variant attempted for product {ProductId}.",
                request.ProductId);

            return Conflict(new
            {
                error = "This inventory variant already exists. Refresh the inventory and try again."
            });
        }
    }
}
