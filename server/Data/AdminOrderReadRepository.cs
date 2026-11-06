
using Npgsql;
using server.Api.Data;

namespace server.Api.Data;

public sealed class AdminOrderReadRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public AdminOrderReadRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<IReadOnlyList<CustomerOrderDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                id,
                order_code,
                customer_full_name,
                customer_email,
                mobile_number,
                street_address,
                barangay,
                city_municipality,
                province,
                postal_code,
                delivery_notes,
                ready_subtotal,
                preorder_subtotal,
                deposit_percent,
                deposit_amount,
                due_today,
                balance_later,
                order_status,
                payment_status,
                is_test,
                created_at,
                updated_at
            FROM app_private.orders
            ORDER BY created_at DESC;
            """;

        var orders = new List<CustomerOrderDto>();

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using (var command = new NpgsqlCommand(sql, connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                orders.Add(ReadOrder(reader));
            }
        }

        if (orders.Count == 0)
        {
            return orders;
        }

        await LoadItemsAsync(connection, orders, cancellationToken);
        await LoadPaymentsAsync(connection, orders, cancellationToken);
        await LoadStatusHistoryAsync(connection, orders, cancellationToken);

        return orders;
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
            DeliveryNotes = reader.IsDBNull(10)
                ? null
                : reader.GetString(10),

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
        var orderLookup = orders.ToDictionary(order => order.Id);

        const string sql = """
            SELECT
                order_id,
                product_id,
                product_slug_snapshot,
                product_name_snapshot,
                fulfillment_status_snapshot,
                unit_price,
                quantity,
                size,
                line_total
            FROM app_private.order_items
            WHERE order_id = ANY(@order_ids)
            ORDER BY created_at ASC;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("order_ids", orderIds);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var orderId = reader.GetGuid(0);

            if (!orderLookup.TryGetValue(orderId, out var order))
            {
                continue;
            }

            order.Items.Add(new CustomerOrderItemDto
            {
                ProductId = reader.GetGuid(1),
                ProductSlug = reader.GetString(2),
                ProductName = reader.GetString(3),
                FulfillmentStatus = reader.GetString(4),
                UnitPrice = reader.GetDecimal(5),
                Quantity = reader.GetInt16(6),
                Size = reader.IsDBNull(7)
                    ? null
                    : reader.GetString(7),
                LineTotal = reader.GetDecimal(8)
            });
        }
    }

    private static async Task LoadPaymentsAsync(
        NpgsqlConnection connection,
        IReadOnlyCollection<CustomerOrderDto> orders,
        CancellationToken cancellationToken)
    {
        var orderIds = orders.Select(order => order.Id).ToArray();
        var orderLookup = orders.ToDictionary(order => order.Id);

        const string sql = """
            SELECT
                order_id,
                id,
                payment_purpose,
                payment_method,
                payment_source_provider,
                sender_name,
                reference_number,
                amount,
                verification_status,
                submitted_at,
                verified_at,
                admin_note
            FROM app_private.payment_submissions
            WHERE order_id = ANY(@order_ids)
            ORDER BY submitted_at DESC;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("order_ids", orderIds);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var orderId = reader.GetGuid(0);

            if (!orderLookup.TryGetValue(orderId, out var order))
            {
                continue;
            }

            order.Payments.Add(new CustomerPaymentDto
            {
                Id = reader.GetGuid(1),
                PaymentPurpose = reader.GetString(2),
                PaymentMethod = reader.GetString(3),
                SourceProvider = reader.IsDBNull(4)
                    ? null
                    : reader.GetString(4),
                SenderName = reader.GetString(5),
                ReferenceNumber = reader.GetString(6),
                Amount = reader.GetDecimal(7),
                Status = reader.GetString(8),
                SubmittedAt = reader.GetFieldValue<DateTimeOffset>(9),
                VerifiedAt = reader.IsDBNull(10)
                    ? null
                    : reader.GetFieldValue<DateTimeOffset>(10),
                RejectionReason = reader.IsDBNull(11)
                    ? null
                    : reader.GetString(11)
            });
        }
    }

    private static async Task LoadStatusHistoryAsync(
        NpgsqlConnection connection,
        IReadOnlyCollection<CustomerOrderDto> orders,
        CancellationToken cancellationToken)
    {
        var orderIds = orders.Select(order => order.Id).ToArray();
        var orderLookup = orders.ToDictionary(order => order.Id);

        const string sql = """
            SELECT
                order_id,
                id,
                previous_status,
                new_status,
                note,
                changed_by,
                created_at
            FROM app_private.order_status_history
            WHERE order_id = ANY(@order_ids)
            ORDER BY created_at ASC, id ASC;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("order_ids", orderIds);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var orderId = reader.GetGuid(0);

            if (!orderLookup.TryGetValue(orderId, out var order))
            {
                continue;
            }

            order.Events.Add(new CustomerOrderStatusEventDto
            {
                Id = reader.GetGuid(1),
                PreviousStatus = reader.IsDBNull(2)
                    ? null
                    : reader.GetString(2),
                NewStatus = reader.GetString(3),
                Note = reader.IsDBNull(4)
                    ? null
                    : reader.GetString(4),
                ChangedBy = reader.GetString(5),
                CreatedAt = reader.GetFieldValue<DateTimeOffset>(6)
            });
        }
    }
}
