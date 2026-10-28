namespace server.Api.Models;

public sealed record ProductResponse(
    Guid Id,
    string Slug,
    string Name,
    decimal Price,
    string Image,
    string Category,
    string Status,
    string[] Sizes);