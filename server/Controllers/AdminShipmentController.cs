
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Data;

namespace server.Api.Controllers;

[ApiController]
[Route("api/admin/shipments")]
[Authorize(Policy = "OwnerOrAdmin")]
public sealed class AdminShipmentsController : ControllerBase
{
    private readonly AdminShipmentRepository _repository;

    public AdminShipmentsController(AdminShipmentRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminShipmentDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var shipments = await _repository.GetAllAsync(cancellationToken);

        return Ok(shipments);
    }

    [HttpGet("{orderId:guid}")]
    public async Task<ActionResult<AdminShipmentDetailsDto>> GetByOrderId(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var shipment = await _repository.GetByOrderIdAsync(
            orderId,
            cancellationToken);

        if (shipment is null)
        {
            return NotFound(new { error = "Order not found." });
        }

        return Ok(shipment);
    }

    [HttpPut("{orderId:guid}")]
    public async Task<IActionResult> Update(
        Guid orderId,
        [FromBody] UpdateShipmentRequest request,
        CancellationToken cancellationToken)
    {
        var changedBy = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(changedBy))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.ShipmentStatus))
        {
            return BadRequest(new { error = "Shipment status is required." });
        }

        try
        {
            var updated = await _repository.UpdateAsync(
                orderId,
                request,
                changedBy,
                cancellationToken);

            if (!updated)
            {
                return NotFound(new { error = "Order not found." });
            }

            return NoContent();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    [HttpPut("{orderId:guid}/shipping-fee")]
    public async Task<IActionResult> UpdateShippingFee(
        Guid orderId,
        [FromBody] UpdateShippingFeeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _repository.UpdateShippingFeeAsync(
                orderId,
                request.ShippingFee,
                request.ShippingFeeStatus,
                cancellationToken);

            if (!updated)
            {
                return NotFound(new { error = "Order not found." });
            }

            return NoContent();
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }
}
