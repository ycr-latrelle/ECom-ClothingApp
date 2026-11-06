
using System.ComponentModel.DataAnnotations;

namespace server.Api.Models;

public sealed class ProductUpsertRequest
{
    [Required]
    [StringLength(120, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(140, MinimumLength = 1)]
    [RegularExpression(
        "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        ErrorMessage = "Slug must contain lowercase letters, numbers, and hyphens only.")]
    public string Slug { get; set; } = string.Empty;

    [Range(typeof(decimal), "0", "999999999")]
    public decimal Price { get; set; }

    [Required]
    [RegularExpression("^(tops|bottoms|footwear|accessories)$")]
    public string Category { get; set; } = "tops";

    [Required]
    [RegularExpression("^(ready|pre-order)$")]
    public string Status { get; set; } = "ready";

    [MaxLength(20)]
    public string[] Sizes { get; set; } = [];

    [MaxLength(20)]
    public string[] Colors { get; set; } = [];

    public bool IsActive { get; set; } = true;

    public bool IsMock { get; set; } = false;
}

public sealed class UpdateProductStatusRequest
{
    public bool IsActive { get; set; }
}

public sealed record AdminProductResponse(
    Guid Id,
    string Slug,
    string Name,
    decimal Price,
    string Image,
    string Category,
    string Status,
    string[] Sizes,
    string[] Colors,
    bool IsActive,
    bool IsMock);
