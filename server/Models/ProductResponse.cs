
namespace server.Api.Models;

/// <summary>Represents a product available to customers in the storefront.</summary>
public sealed record ProductResponse(
    Guid Id,
    string Slug,
    string Name,
    decimal Price,
    string Image,
    string Category,
    string Status,
    string[] Sizes,
    string[] Colors,
    bool IsInStock,
    ProductVariantAvailabilityResponse[] AvailableVariants);

/// <summary>Describes a selectable product variant and whether it can be ordered.</summary>
public sealed record ProductVariantAvailabilityResponse(
    string? Color,
    string? Size,
    bool IsAvailable);
