using Npgsql;
using NpgsqlTypes;
using server.Api.Services;

namespace server.Api.Data;

public sealed class PaymentSubmissionRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public PaymentSubmissionRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<PaymentReceiptOrder?> GetOrderForPaymentAsync(
        Guid orderId,
        string firebaseUid,
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
                o.delivery_latitude,
                o.delivery_longitude,
                o.due_today,
                o.payment_status,
                oi.product_id,
                oi.product_name_snapshot,
                oi.quantity,
                oi.size,
                oi.unit_price
            FROM app_private.orders AS o
            JOIN app_private.order_items AS oi ON oi.order_id = o.id
            WHERE o.id = @order_id
              AND o.firebase_uid = @firebase_uid
            ORDER BY oi.product_name_snapshot;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("order_id", orderId);
        command.Parameters.AddWithValue("firebase_uid", firebaseUid);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        PaymentReceiptOrder? order = null;

        while (await reader.ReadAsync(cancellationToken))
        {
            order ??= new PaymentReceiptOrder
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
                DeliveryLatitude = reader.GetDouble(10),
                DeliveryLongitude = reader.GetDouble(11),
                DueToday = reader.GetDecimal(12),
                PaymentStatus = reader.GetString(13),
            };

            order.Products.Add(new PaymentReceiptProduct(
                reader.GetGuid(14),
                reader.GetString(15),
                reader.GetInt16(16),
                reader.IsDBNull(17) ? null : reader.GetString(17),
                reader.GetDecimal(18)));
        }

        return order;
    }

    public async Task<bool> SavePendingVerificationAsync(
        Guid orderId,
        string firebaseUid,
        string paymentMethod,
        string senderName,
        string paymentReferenceNumber,
        decimal amount,
        TelegramReceiptReference telegramReceipt,
        CancellationToken cancellationToken = default)
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        const string updateOrderSql = """
            UPDATE app_private.orders
            SET payment_status = 'pending_verification',
                updated_at = NOW()
            WHERE id = @order_id
              AND firebase_uid = @firebase_uid
              AND payment_status = 'awaiting_submission';
            """;

        await using (var updateCommand =
                     new NpgsqlCommand(updateOrderSql, connection, transaction))
        {
            updateCommand.Parameters.AddWithValue("order_id", orderId);
            updateCommand.Parameters.AddWithValue("firebase_uid", firebaseUid);

            var updatedRows =
                await updateCommand.ExecuteNonQueryAsync(cancellationToken);

            if (updatedRows != 1)
            {
                await transaction.RollbackAsync(cancellationToken);
                return false;
            }
        }

        const string insertPaymentSql = """
            INSERT INTO app_private.payment_submissions (
                order_id,
                firebase_uid,
                payment_purpose,
                payment_method,
                sender_name,
                reference_number,
                amount,
                verification_status,
                telegram_chat_id,
                telegram_message_id,
                telegram_file_id
            )
            VALUES (
                @order_id,
                @firebase_uid,
                'initial_due',
                @payment_method,
                @sender_name,
                @reference_number,
                @amount,
                'pending_verification',
                @telegram_chat_id,
                @telegram_message_id,
                @telegram_file_id
            );
            """;

        await using (var insertCommand =
                     new NpgsqlCommand(insertPaymentSql, connection, transaction))
        {
            insertCommand.Parameters.AddWithValue("order_id", orderId);
            insertCommand.Parameters.AddWithValue("firebase_uid", firebaseUid);
            insertCommand.Parameters.AddWithValue("payment_method", paymentMethod);
            insertCommand.Parameters.AddWithValue("sender_name", senderName);
            insertCommand.Parameters.AddWithValue(
                "reference_number",
                paymentReferenceNumber);
            insertCommand.Parameters.Add(
                "amount",
                NpgsqlDbType.Numeric).Value = amount;
            insertCommand.Parameters.AddWithValue(
                "telegram_chat_id",
                telegramReceipt.ChatId);
            insertCommand.Parameters.AddWithValue(
                "telegram_message_id",
                telegramReceipt.MessageId);
            insertCommand.Parameters.AddWithValue(
                "telegram_file_id",
                telegramReceipt.FileId);

            await insertCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return true;
    }
}

public sealed class PaymentReceiptOrder
{
    public Guid Id { get; init; }
    public string OrderCode { get; init; } = string.Empty;
    public string CustomerFullName { get; init; } = string.Empty;
    public string CustomerEmail { get; init; } = string.Empty;
    public string MobileNumber { get; init; } = string.Empty;
    public string StreetAddress { get; init; } = string.Empty;
    public string Barangay { get; init; } = string.Empty;
    public string CityMunicipality { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string PostalCode { get; init; } = string.Empty;
    public double DeliveryLatitude { get; init; }
    public double DeliveryLongitude { get; init; }
    public decimal DueToday { get; init; }
    public string PaymentStatus { get; init; } = string.Empty;
    public List<PaymentReceiptProduct> Products { get; } = [];
}

public sealed record PaymentReceiptProduct(
    Guid ProductId,
    string Name,
    int Quantity,
    string? Size,
    decimal UnitPrice);