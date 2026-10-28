using System.ComponentModel.DataAnnotations;

namespace server.Api.Models;

public sealed class CreateOrderRequest
{
    [Required]
    [StringLength(200)]
    public string CustomerFullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(254)]
    public string CustomerEmail { get; set; } = string.Empty;

    [Required]
    [Phone]
    [StringLength(30)]
    public string MobileNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string StreetAddress { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Barangay { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string CityMunicipality { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Province { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string PostalCode { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? DeliveryNotes { get; set; }

    [Required]
    [Range(-90, 90)]
    public double? DeliveryLatitude { get; set; }

    [Required]
    [Range(-180, 180)]
    public double? DeliveryLongitude { get; set; }

    [Range(0, 100000)]
    public double? DeliveryAccuracyMeters { get; set; }

    [Required]
    [MinLength(1)]
    [MaxLength(20)]
    public List<CreateOrderItemRequest> Items { get; set; } = new();
}

public sealed class CreateOrderItemRequest
{
    [Required]
    public Guid? ProductId { get; set; }

    [Range(1, 10)]
    public int Quantity { get; set; }

    [StringLength(20)]
    public string? Size { get; set; }
}