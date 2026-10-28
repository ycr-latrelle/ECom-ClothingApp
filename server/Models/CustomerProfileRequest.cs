using System.ComponentModel.DataAnnotations;

namespace server.Api.Models;

public sealed class CustomerProfileRequest
{
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [StringLength(100)]
    public string? MiddleName { get; set; }

    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Range(1, 120)]
    public int Age { get; set; }

    [Required]
    [StringLength(50)]
    public string Gender { get; set; } = string.Empty;

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
}