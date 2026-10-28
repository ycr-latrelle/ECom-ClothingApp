using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Data;
using server.Api.Models;

namespace server.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public sealed class OrdersController : ControllerBase
{
    private readonly OrderRepository _repository;

    public OrdersController(OrderRepository repository)
    {
        _repository = repository;
    }

    [HttpPost]
    public async Task<ActionResult<CreateOrderResponse>> Create(
        [FromBody] CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return Unauthorized();
        }

        try
        {
            var order = await _repository.CreateAsync(
                firebaseUid,
                request,
                cancellationToken);

            return StatusCode(StatusCodes.Status201Created, order);
        }
        catch (OrderValidationException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }
}