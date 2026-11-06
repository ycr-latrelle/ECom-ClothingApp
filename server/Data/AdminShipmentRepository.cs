
using Npgsql;
using NpgsqlTypes;

namespace server.Api.Data;

public sealed class AdminShipmentRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public AdminShipmentRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<IReadOnlyList<AdminShipmentDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                o.id,
                o.order_code,
                o.customer_full_name,
                o.customer_email,
                o.mobile_number,
                o.street_address,
                o.barangay,
                o.city_municipality,
                o.province,
                o.postal_code,
                o.delivery_notes,
                o.delivery_latitude,
                o.delivery_longitude,
                o.delivery_accuracy_meters,
                o.shipping_fee,
                o.shipping_fee_status,

                s.id,
                s.courier,
                s.tracking_number,
                s.tracking_url,
                COALESCE(s.shipment_status, 'not_shipped'),
                s.shipped_at,
                s.estimated_delivery_at,
                s.delivered_at,
                s.updated_by,
                s.created_at,
                s.updated_at

            FROM app_private.orders o

            LEFT JOIN app_private.order_shipments s
                ON s.order_id = o.id

            ORDER BY o.created_at DESC;
            """;

        var shipments = new List<AdminShipmentDto>();

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            shipments.Add(ReadShipment(reader));
        }

        return shipments;
    }

    public async Task<AdminShipmentDetailsDto?> GetByOrderIdAsync(
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                o.id,
                o.order_code,
                o.customer_full_name,
                o.customer_email,
                o.mobile_number,
                o.street_address,
                o.barangay,
                o.city_municipality,
                o.province,
                o.postal_code,
                o.delivery_notes,
                o.delivery_latitude,
                o.delivery_longitude,
                o.delivery_accuracy_meters,
                o.shipping_fee,
                o.shipping_fee_status,

                s.id,
                s.courier,
                s.tracking_number,
                s.tracking_url,
                COALESCE(s.shipment_status, 'not_shipped'),
                s.shipped_at,
                s.estimated_delivery_at,
                s.delivered_at,
                s.updated_by,
                s.created_at,
                s.updated_at

            FROM app_private.orders o

            LEFT JOIN app_private.order_shipments s
                ON s.order_id = o.id

            WHERE o.id = @order_id
            LIMIT 1;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        AdminShipmentDetailsDto? shipment;

        await using (var command = new NpgsqlCommand(sql, connection))
        {
            command.Parameters.AddWithValue("order_id", orderId);

            await using var reader =
                await command.ExecuteReaderAsync(cancellationToken);

            shipment = await reader.ReadAsync(cancellationToken)
                ? ReadShipmentDetails(reader)
                : null;
        }

        if (shipment is null || shipment.ShipmentId is null)
        {
            return shipment;
        }

        const string historySql = """
            SELECT
                id,
                previous_status,
                new_status,
                note,
                changed_by,
                created_at
            FROM app_private.shipment_status_history
            WHERE shipment_id = @shipment_id
            ORDER BY created_at ASC, id ASC;
            """;

        await using (var historyCommand =
                     new NpgsqlCommand(historySql, connection))
        {
            historyCommand.Parameters.AddWithValue(
                "shipment_id",
                shipment.ShipmentId.Value);

            await using var reader =
                await historyCommand.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                shipment.History.Add(new AdminShipmentHistoryDto(
                    reader.GetGuid(0),
                    reader.IsDBNull(1) ? null : reader.GetString(1),
                    reader.GetString(2),
                    reader.IsDBNull(3) ? null : reader.GetString(3),
                    reader.GetString(4),
                    reader.GetFieldValue<DateTimeOffset>(5)));
            }
        }

        return shipment;
    }

    public async Task<bool> UpdateAsync(
        Guid orderId,
        UpdateShipmentRequest request,
        string changedBy,
        CancellationToken cancellationToken = default)
    {
        var courier = NormalizeOptional(request.Courier);
        var trackingNumber = NormalizeOptional(request.TrackingNumber);
        var trackingUrl = NormalizeOptional(request.TrackingUrl);
        var note = NormalizeOptional(request.Note);

        var status = request.ShipmentStatus.Trim().ToLowerInvariant();

        if (!AllowedStatuses.Contains(status))
        {
            throw new ArgumentException("Invalid shipment status.");
        }

        if (courier is not null && !AllowedCouriers.Contains(courier))
        {
            throw new ArgumentException("Invalid courier.");
        }

        if (trackingUrl is not null &&
            (!Uri.TryCreate(trackingUrl, UriKind.Absolute, out var uri) ||
             (uri.Scheme != Uri.UriSchemeHttp &&
              uri.Scheme != Uri.UriSchemeHttps)))
        {
            throw new ArgumentException("Tracking URL must be a valid HTTP or HTTPS URL.");
        }

        if (request.EstimatedDeliveryAt.HasValue &&
            request.EstimatedDeliveryAt.Value.Offset != TimeSpan.Zero)
        {
            throw new ArgumentException(
                "Estimated delivery date must be provided in UTC.");
        }

        if (request.EstimatedDeliveryAt.HasValue &&
            request.EstimatedDeliveryAt.Value < DateTimeOffset.UtcNow)
        {
            throw new ArgumentException(
                "Estimated delivery date cannot be in the past.");
        }

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        const string existingSql = """
            SELECT
                id,
                shipment_status,
                shipped_at,
                delivered_at
            FROM app_private.order_shipments
            WHERE order_id = @order_id
            FOR UPDATE;
            """;

        Guid? shipmentId = null;
        string? previousStatus = null;
        DateTimeOffset? existingShippedAt = null;
        DateTimeOffset? existingDeliveredAt = null;

        await using (var existingCommand =
                     new NpgsqlCommand(
                         existingSql,
                         connection,
                         transaction))
        {
            existingCommand.Parameters.AddWithValue("order_id", orderId);

            await using var reader =
                await existingCommand.ExecuteReaderAsync(cancellationToken);

            if (await reader.ReadAsync(cancellationToken))
            {
                shipmentId = reader.GetGuid(0);
                previousStatus = reader.GetString(1);

                existingShippedAt = reader.IsDBNull(2)
                    ? null
                    : reader.GetFieldValue<DateTimeOffset>(2);

                existingDeliveredAt = reader.IsDBNull(3)
                    ? null
                    : reader.GetFieldValue<DateTimeOffset>(3);
            }
        }

        if (shipmentId is null)
        {
            const string orderExistsSql = """
                SELECT EXISTS(
                    SELECT 1
                    FROM app_private.orders
                    WHERE id = @order_id
                );
                """;

            await using var orderCommand =
                new NpgsqlCommand(
                    orderExistsSql,
                    connection,
                    transaction);

            orderCommand.Parameters.AddWithValue("order_id", orderId);

            var exists = (bool)(await orderCommand.ExecuteScalarAsync(
                cancellationToken) ?? false);

            if (!exists)
            {
                return false;
            }
        }

        var now = DateTimeOffset.UtcNow;

        var shippedAt = status == "not_shipped"
            ? existingShippedAt
            : existingShippedAt ?? now;

        var deliveredAt = status == "delivered"
            ? existingDeliveredAt ?? now
            : existingDeliveredAt;

        const string upsertSql = """
            INSERT INTO app_private.order_shipments (
                order_id,
                courier,
                tracking_number,
                tracking_url,
                shipment_status,
                shipped_at,
                estimated_delivery_at,
                delivered_at,
                updated_by,
                created_at,
                updated_at
            )
            VALUES (
                @order_id,
                @courier,
                @tracking_number,
                @tracking_url,
                @shipment_status,
                @shipped_at,
                @estimated_delivery_at,
                @delivered_at,
                @updated_by,
                @now,
                @now
            )
            ON CONFLICT (order_id)
            DO UPDATE SET
                courier = EXCLUDED.courier,
                tracking_number = EXCLUDED.tracking_number,
                tracking_url = EXCLUDED.tracking_url,
                shipment_status = EXCLUDED.shipment_status,
                shipped_at = EXCLUDED.shipped_at,
                estimated_delivery_at = EXCLUDED.estimated_delivery_at,
                delivered_at = EXCLUDED.delivered_at,
                updated_by = EXCLUDED.updated_by,
                updated_at = EXCLUDED.updated_at
            RETURNING id;
            """;

        Guid savedShipmentId;

        await using (var command =
                     new NpgsqlCommand(
                         upsertSql,
                         connection,
                         transaction))
        {
            command.Parameters.AddWithValue("order_id", orderId);

            command.Parameters.Add("courier", NpgsqlDbType.Text).Value =
                (object?)courier ?? DBNull.Value;

            command.Parameters.Add("tracking_number", NpgsqlDbType.Text).Value =
                (object?)trackingNumber ?? DBNull.Value;

            command.Parameters.Add("tracking_url", NpgsqlDbType.Text).Value =
                (object?)trackingUrl ?? DBNull.Value;

            command.Parameters.AddWithValue("shipment_status", status);

            command.Parameters.Add("shipped_at", NpgsqlDbType.TimestampTz).Value =
                (object?)shippedAt ?? DBNull.Value;

            command.Parameters.Add("estimated_delivery_at", NpgsqlDbType.TimestampTz).Value =
                (object?)request.EstimatedDeliveryAt ?? DBNull.Value;

            command.Parameters.Add("delivered_at", NpgsqlDbType.TimestampTz).Value =
                (object?)deliveredAt ?? DBNull.Value;

            command.Parameters.AddWithValue("updated_by", changedBy);
            command.Parameters.AddWithValue("now", now);

            savedShipmentId = (Guid)(await command.ExecuteScalarAsync(
                cancellationToken))!;
        }

        if (!string.Equals(previousStatus, status, StringComparison.Ordinal))
        {
            const string historySql = """
                INSERT INTO app_private.shipment_status_history (
                    shipment_id,
                    previous_status,
                    new_status,
                    note,
                    changed_by,
                    created_at
                )
                VALUES (
                    @shipment_id,
                    @previous_status,
                    @new_status,
                    @note,
                    @changed_by,
                    @created_at
                );
                """;

            await using var historyCommand =
                new NpgsqlCommand(
                    historySql,
                    connection,
                    transaction);

            historyCommand.Parameters.AddWithValue(
                "shipment_id",
                savedShipmentId);

            historyCommand.Parameters.Add(
                "previous_status",
                NpgsqlDbType.Text).Value =
                (object?)previousStatus ?? DBNull.Value;

            historyCommand.Parameters.AddWithValue(
                "new_status",
                status);

            historyCommand.Parameters.Add(
                "note",
                NpgsqlDbType.Text).Value =
                (object?)note ?? DBNull.Value;

            historyCommand.Parameters.AddWithValue(
                "changed_by",
                changedBy);

            historyCommand.Parameters.AddWithValue(
                "created_at",
                now);

            await historyCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        return true;
    }

    public async Task<bool> UpdateShippingFeeAsync(
        Guid orderId,
        decimal? shippingFee,
        string shippingFeeStatus,
        CancellationToken cancellationToken = default)
    {
        if (shippingFee is < 0)
        {
            throw new ArgumentException("Shipping fee cannot be negative.");
        }

        var normalizedStatus = shippingFeeStatus.Trim().ToLowerInvariant();

        if (!AllowedShippingFeeStatuses.Contains(normalizedStatus))
        {
            throw new ArgumentException("Invalid shipping fee status.");
        }

        if (normalizedStatus == "confirmed" && !shippingFee.HasValue)
        {
            throw new ArgumentException(
                "A confirmed shipping fee requires an amount.");
        }

        if (normalizedStatus == "waived")
        {
            shippingFee = 0m;
        }

        if (normalizedStatus == "to_be_confirmed")
        {
            shippingFee = null;
        }

        const string sql = """
            UPDATE app_private.orders
            SET
                shipping_fee = @shipping_fee,
                shipping_fee_status = @shipping_fee_status,
                updated_at = @updated_at
            WHERE id = @order_id;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("order_id", orderId);

        command.Parameters.Add("shipping_fee", NpgsqlDbType.Numeric).Value =
            (object?)shippingFee ?? DBNull.Value;

        command.Parameters.AddWithValue(
            "shipping_fee_status",
            normalizedStatus);

        command.Parameters.AddWithValue(
            "updated_at",
            DateTimeOffset.UtcNow);

        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private static AdminShipmentDto ReadShipment(NpgsqlDataReader reader)
    {
        return new AdminShipmentDto
        {
            OrderId = reader.GetGuid(0),
            OrderCode = reader.GetString(1),
            CustomerName = reader.GetString(2),
            CustomerEmail = reader.GetString(3),
            MobileNumber = reader.GetString(4),
            StreetAddress = reader.GetString(5),
            Barangay = reader.GetString(6),
            CityMunicipality = reader.GetString(7),
            Province = reader.GetString(8),
            PostalCode = reader.GetString(9),
            DeliveryNotes = reader.IsDBNull(10) ? null : reader.GetString(10),

            // PostgreSQL double precision -> C# decimal
            DeliveryLatitude = Convert.ToDecimal(reader.GetDouble(11)),
            DeliveryLongitude = Convert.ToDecimal(reader.GetDouble(12)),

            DeliveryAccuracyMeters = reader.IsDBNull(13)
                ? null
                : Convert.ToDecimal(reader.GetDouble(13)),

            // PostgreSQL numeric -> C# decimal
            ShippingFee = reader.IsDBNull(14)
                ? null
                : reader.GetDecimal(14),

            ShippingFeeStatus = reader.GetString(15),

            ShipmentId = reader.IsDBNull(16) ? null : reader.GetGuid(16),
            Courier = reader.IsDBNull(17) ? null : reader.GetString(17),
            TrackingNumber = reader.IsDBNull(18) ? null : reader.GetString(18),
            TrackingUrl = reader.IsDBNull(19) ? null : reader.GetString(19),
            ShipmentStatus = reader.GetString(20),

            ShippedAt = reader.IsDBNull(21)
                ? null
                : reader.GetFieldValue<DateTimeOffset>(21),

            EstimatedDeliveryAt = reader.IsDBNull(22)
                ? null
                : reader.GetFieldValue<DateTimeOffset>(22),

            DeliveredAt = reader.IsDBNull(23)
                ? null
                : reader.GetFieldValue<DateTimeOffset>(23),

            UpdatedBy = reader.IsDBNull(24) ? null : reader.GetString(24),

            CreatedAt = reader.IsDBNull(25)
                ? null
                : reader.GetFieldValue<DateTimeOffset>(25),

            UpdatedAt = reader.IsDBNull(26)
                ? null
                : reader.GetFieldValue<DateTimeOffset>(26)
        };
    }

    private static AdminShipmentDetailsDto ReadShipmentDetails(
        NpgsqlDataReader reader)
    {
        var record = ReadShipment(reader);

        return new AdminShipmentDetailsDto
        {
            OrderId = record.OrderId,
            OrderCode = record.OrderCode,
            CustomerName = record.CustomerName,
            CustomerEmail = record.CustomerEmail,
            MobileNumber = record.MobileNumber,
            StreetAddress = record.StreetAddress,
            Barangay = record.Barangay,
            CityMunicipality = record.CityMunicipality,
            Province = record.Province,
            PostalCode = record.PostalCode,
            DeliveryNotes = record.DeliveryNotes,
            DeliveryLatitude = record.DeliveryLatitude,
            DeliveryLongitude = record.DeliveryLongitude,
            DeliveryAccuracyMeters = record.DeliveryAccuracyMeters,
            ShippingFee = record.ShippingFee,
            ShippingFeeStatus = record.ShippingFeeStatus,
            ShipmentId = record.ShipmentId,
            Courier = record.Courier,
            TrackingNumber = record.TrackingNumber,
            TrackingUrl = record.TrackingUrl,
            ShipmentStatus = record.ShipmentStatus,
            ShippedAt = record.ShippedAt,
            EstimatedDeliveryAt = record.EstimatedDeliveryAt,
            DeliveredAt = record.DeliveredAt,
            UpdatedBy = record.UpdatedBy,
            CreatedAt = record.CreatedAt,
            UpdatedAt = record.UpdatedAt
        };
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static readonly HashSet<string> AllowedCouriers =
    [
        "gogo_express",
        "jnt",
        "lbc"
    ];

    private static readonly HashSet<string> AllowedStatuses =
    [
        "not_shipped",
        "ready_for_pickup",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "delivery_failed",
        "returned",
        "cancelled"
    ];

    private static readonly HashSet<string> AllowedShippingFeeStatuses =
    [
        "to_be_confirmed",
        "confirmed",
        "waived"
    ];
}

// --------------------------------------------------
// RESPONSE MODELS
// --------------------------------------------------

public class AdminShipmentDto
{
    public Guid OrderId { get; set; }
    public string OrderCode { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string CustomerEmail { get; set; } = "";
    public string MobileNumber { get; set; } = "";

    public string StreetAddress { get; set; } = "";
    public string Barangay { get; set; } = "";
    public string CityMunicipality { get; set; } = "";
    public string Province { get; set; } = "";
    public string PostalCode { get; set; } = "";
    public string? DeliveryNotes { get; set; }

    public decimal DeliveryLatitude { get; set; }
    public decimal DeliveryLongitude { get; set; }
    public decimal? DeliveryAccuracyMeters { get; set; }

    public decimal? ShippingFee { get; set; }
    public string ShippingFeeStatus { get; set; } = "";

    public Guid? ShipmentId { get; set; }
    public string? Courier { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public string ShipmentStatus { get; set; } = "not_shipped";

    public DateTimeOffset? ShippedAt { get; set; }
    public DateTimeOffset? EstimatedDeliveryAt { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }

    public string? UpdatedBy { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}

public sealed class AdminShipmentDetailsDto : AdminShipmentDto
{
    public List<AdminShipmentHistoryDto> History { get; set; } = [];
}

public sealed record AdminShipmentHistoryDto(
    Guid Id,
    string? PreviousStatus,
    string NewStatus,
    string? Note,
    string ChangedBy,
    DateTimeOffset CreatedAt);

public sealed class UpdateShipmentRequest
{
    public string? Courier { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public string ShipmentStatus { get; set; } = "not_shipped";
    public DateTimeOffset? EstimatedDeliveryAt { get; set; }
    public string? Note { get; set; }
}

public sealed class UpdateShippingFeeRequest
{
    public decimal? ShippingFee { get; set; }
    public string ShippingFeeStatus { get; set; } = "to_be_confirmed";
}
