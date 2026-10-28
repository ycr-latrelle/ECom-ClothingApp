using Microsoft.AspNetCore.Mvc;
using server.Api.Data;
using server.Api.Models;

namespace server.Api.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductsController : ControllerBase
{
    private readonly ProductRepository _repository;

    public ProductsController(ProductRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductResponse>>> Get(
        CancellationToken cancellationToken)
    {
        var products = await _repository.GetActiveAsync(cancellationToken);
        return Ok(products);
    }
}