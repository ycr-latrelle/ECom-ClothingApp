
using Npgsql;

namespace server.Api.Data;

public sealed class OrderReadRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public OrderReadRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<IReadOnlyList<CustomerOrderDto>> GetCustomerOrdersAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                id, order_code, customer_full_name, customer_email,
                mobile_number, street_address, barangay, city_municipality,
                province, postal_code, delivery_notes,
                ready_subtotal, preorder_subtotal, deposit_percent,
                deposit_amount, due_today, balance_later,
                order_status, payment_status, is_test, created_at, updated_at
            FROM app_private.orders
            WHERE firebase_uid = @firebase_uid
            ORDER BY created_at DESC;
            """;

        var orders = new List<CustomerOrderDto>();

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("firebase_uid", firebaseUid);

        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                orders.Add(ReadOrder(reader));
            }
        }

        if (orders.Count == 0)
            return orders;

        await LoadItemsAsync(connection, orders, cancellationToken);

        return orders;
    }

    public async Task<CustomerOrderDto?> GetCustomerOrderAsync(
        Guid orderId,
        string firebaseUid,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                id, order_code, customer_full_name, customer_email,
                mobile_number, street_address, barangay, city_municipality,
                province, postal_code, delivery_notes,
                ready_subtotal, preorder_subtotal, deposit_percent,
                deposit_amount, due_today, balance_later,
                order_status, payment_status, is_test, created_at, updated_at
            FROM app_private.orders
            WHERE id = @order_id
              AND firebase_uid = @firebase_uid
            LIMIT 1;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("order_id", orderId);
        command.Parameters.AddWithValue("firebase_uid", firebaseUid);

        CustomerOrderDto? order;

        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            order = await reader.ReadAsync(cancellationToken)
                ? ReadOrder(reader)
                : null;
        }

        if (order is null)
            return null;

        await LoadItemsAsync(connection, [order], cancellationToken);

        await LoadPaymentsAsync(
            connection,
            order,
            firebaseUid,
            cancellationToken);

        return order;
    }

    private static CustomerOrderDto ReadOrder(NpgsqlDataReader reader)
    {
        return new CustomerOrderDto
        {
            Id = reader.GetGuid(0),
            OrderCode = reader.GetString(1),
            CustomerFullName = reader.GetString(2),
            CustomerEmail = reader.GetString(3),
            MobileNumber = reader.GetString(4),

            StreetAddress = reader.GetString(5),
            Barangay = reader.GetString(6),
            CityMunicipality = reader.GetString(7),
            Province = reader.GetString(8),
            PostalCode = reader.GetString(9),
            DeliveryNotes = reader.IsDBNull(10) ? null : reader.GetString(10),

            ReadySubtotal = reader.GetDecimal(11),
            PreorderSubtotal = reader.GetDecimal(12),
            DepositPercent = reader.GetDecimal(13),
            DepositAmount = reader.GetDecimal(14),
            DueToday = reader.GetDecimal(15),
            BalanceLater = reader.GetDecimal(16),

            OrderStatus = reader.GetString(17),
            PaymentStatus = reader.GetString(18),
            IsTest = reader.GetBoolean(19),

            CreatedAt = reader.GetFieldValue<DateTimeOffset>(20),
            UpdatedAt = reader.GetFieldValue<DateTimeOffset>(21)
        };
    }

    private static async Task LoadItemsAsync(
        NpgsqlConnection connection,
        IReadOnlyCollection<CustomerOrderDto> orders,
        CancellationToken cancellationToken)
    {
        var orderIds = orders.Select(order => order.Id).ToArray();

        const string sql = """
            SELECT
                order_id, product_id, product_slug_snapshot,
                product_name_snapshot, fulfillment_status_snapshot,
                unit_price, quantity, size, line_total
            FROM app_private.order_items
            WHERE order_id = ANY(@order_ids)
            ORDER BY created_at ASC;
            """;

        var orderLookup = orders.ToDictionary(order => order.Id);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("order_ids", orderIds);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var orderId = reader.GetGuid(0);

            if (!orderLookup.TryGetValue(orderId, out var order))
                continue;

            order.Items.Add(new CustomerOrderItemDto
            {
                ProductId = reader.GetGuid(1),
                ProductSlug = reader.GetString(2),
                ProductName = reader.GetString(3),
                FulfillmentStatus = reader.GetString(4),
                UnitPrice = reader.GetDecimal(5),
                Quantity = reader.GetInt16(6),
                Size = reader.IsDBNull(7) ? null : reader.GetString(7),
                LineTotal = reader.GetDecimal(8)
            });
        }
    }

    private static async Task LoadPaymentsAsync(
        NpgsqlConnection connection,
        CustomerOrderDto order,
        string firebaseUid,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                id, payment_purpose, payment_method,
                payment_source_provider, sender_name,
                reference_number, amount, verification_status,
                submitted_at, verified_at, admin_note
            FROM app_private.payment_submissions
            WHERE order_id = @order_id
              AND firebase_uid = @firebase_uid
            ORDER BY submitted_at DESC;
            """;

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("order_id", order.Id);
        command.Parameters.AddWithValue("firebase_uid", firebaseUid);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            order.Payments.Add(new CustomerPaymentDto
            {
                Id = reader.GetGuid(0),
                PaymentPurpose = reader.GetString(1),
                PaymentMethod = reader.GetString(2),
                SourceProvider = reader.IsDBNull(3) ? null : reader.GetString(3),
                SenderName = reader.GetString(4),
                ReferenceNumber = reader.GetString(5),
                Amount = reader.GetDecimal(6),
                Status = reader.GetString(7),
                SubmittedAt = reader.GetFieldValue<DateTimeOffset>(8),
                VerifiedAt = reader.IsDBNull(9)
                    ? null
                    : reader.GetFieldValue<DateTimeOffset>(9),
                RejectionReason = reader.IsDBNull(10)
                    ? null
                    : reader.GetString(10)
            });
        }
    }
}

public sealed class CustomerOrderDto
{
    public Guid Id { get; set; }
    public string OrderCode { get; set; } = "";
    public string CustomerFullName { get; set; } = "";
    public string CustomerEmail { get; set; } = "";
    public string MobileNumber { get; set; } = "";

    public string StreetAddress { get; set; } = "";
    public string Barangay { get; set; } = "";
    public string CityMunicipality { get; set; } = "";
    public string Province { get; set; } = "";
    public string PostalCode { get; set; } = "";
    public string? DeliveryNotes { get; set; }

    public decimal ReadySubtotal { get; set; }
    public decimal PreorderSubtotal { get; set; }
    public decimal DepositPercent { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal DueToday { get; set; }
    public decimal BalanceLater { get; set; }

    // Combined order subtotal.
    public decimal Subtotal => ReadySubtotal + PreorderSubtotal;

    // Current total; shipping is not included in the existing database schema.
    public decimal Total => ReadySubtotal + PreorderSubtotal;

    public string OrderStatus { get; set; } = "";
    public string PaymentStatus { get; set; } = "";
    public bool IsTest { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public List<CustomerOrderItemDto> Items { get; set; } = [];
    public List<CustomerPaymentDto> Payments { get; set; } = [];

    // Tracking events will be populated when order status history is implemented.
    public List<object> Events { get; set; } = [];
}

public sealed class CustomerOrderItemDto
{
    public Guid ProductId { get; set; }
    public string ProductSlug { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string FulfillmentStatus { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public short Quantity { get; set; }
    public string? Size { get; set; }
    public decimal LineTotal { get; set; }
}

public sealed class CustomerPaymentDto
{
    public Guid Id { get; set; }
    public string PaymentPurpose { get; set; } = "";
    public string PaymentMethod { get; set; } = "";
    public string? SourceProvider { get; set; }
    public string SenderName { get; set; } = "";
    public string ReferenceNumber { get; set; } = "";
    public decimal Amount { get; set; }
    public string Status { get; set; } = "";
    public DateTimeOffset SubmittedAt { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public string? RejectionReason { get; set; }
}
