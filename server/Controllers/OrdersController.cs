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
    private readonly OrderReadRepository _orderReadRepository;

    public OrdersController(
        OrderRepository repository,
        OrderReadRepository orderReadRepository)
    {
        _repository = repository;
        _orderReadRepository = orderReadRepository;
    }

    [HttpPost]
    public async Task<ActionResult<CreateOrderResponse>> Create(
        [FromBody] CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
            return Unauthorized();

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

    // GET: /api/orders
    // Returns only orders owned by the authenticated Firebase user.
    [HttpGet]
    public async Task<IActionResult> GetMyOrders(
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
            return Unauthorized();

        var orders = await _orderReadRepository.GetCustomerOrdersAsync(
            firebaseUid,
            cancellationToken);

        return Ok(orders);
    }

    // GET: /api/orders/{orderId}
    // Returns an order only if it belongs to the authenticated customer.
    [HttpGet("{orderId:guid}")]
    public async Task<IActionResult> GetMyOrder(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
            return Unauthorized();

        var order = await _orderReadRepository.GetCustomerOrderAsync(
            orderId,
            firebaseUid,
            cancellationToken);

        if (order is null)
            return NotFound(new { error = "Order not found." });

        return Ok(order);
    }
}