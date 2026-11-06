
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Data;

namespace server.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Policy = "OwnerOrAdmin")]
public sealed class AdminOrdersController : ControllerBase
{
    private readonly AdminOrderReadRepository _repository;

    public AdminOrdersController(AdminOrderReadRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CustomerOrderDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var orders = await _repository.GetAllAsync(cancellationToken);

        return Ok(orders);
    }
}
