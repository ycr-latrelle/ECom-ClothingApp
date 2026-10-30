using Npgsql;
using NpgsqlTypes;
using server.Api.Models;
using Microsoft.Extensions.Configuration;

namespace server.Api.Data;

public sealed class OrderRepository
{
    private const decimal PreorderDepositPercent = 50m;

    private readonly NpgsqlDataSource _dataSource;

    private readonly bool _isTest;

    public OrderRepository(
            NpgsqlDataSource dataSource,
            IConfiguration configuration)
    {
        _dataSource = dataSource;
        _isTest = configuration.GetValue<bool?>("Orders:IsTest") ?? true;
    }

    public async Task<CreateOrderResponse> CreateAsync(
        string firebaseUid,
        CreateOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Items is null || request.Items.Count == 0)
        {
            throw new OrderValidationException("Add at least one item to the order.");
        }

        if (request.Items.Count > 20)
        {
            throw new OrderValidationException("An order can contain at most 20 cart lines.");
        }

        var submittedLines = new List<RequestedLine>();

        foreach (var item in request.Items)
        {
            if (item.ProductId is null || item.ProductId == Guid.Empty)
            {
                throw new OrderValidationException("A product ID is invalid.");
            }

            if (item.Quantity is < 1 or > 10)
            {
                throw new OrderValidationException("Each item quantity must be between 1 and 10.");
            }

            var size = string.IsNullOrWhiteSpace(item.Size)
                ? null
                : item.Size.Trim().ToUpperInvariant();

            submittedLines.Add(new RequestedLine(
                item.ProductId.Value,
                item.Quantity,
                size));
        }

        var lines = new List<RequestedLine>();

        foreach (var group in submittedLines.GroupBy(
                     line => new { line.ProductId, line.Size }))
        {
            var quantity = group.Sum(line => line.Quantity);

            if (quantity > 10)
            {
                throw new OrderValidationException(
                    "The quantity for a product and size cannot exceed 10.");
            }

            lines.Add(new RequestedLine(
                group.Key.ProductId,
                quantity,
                group.Key.Size));
        }

        var productIds = lines
            .Select(line => line.ProductId)
            .Distinct()
            .ToArray();

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        const string getProductsSql = """
            SELECT id, slug, name, price, status, sizes
            FROM app_private.products
            WHERE id = ANY(@product_ids)
              AND is_active = TRUE;
            """;

        var products = new Dictionary<Guid, ProductRow>();

        await using (var productCommand =
                     new NpgsqlCommand(getProductsSql, connection, transaction))
        {
            productCommand.Parameters.AddWithValue("product_ids", productIds);

            await using var reader =
                await productCommand.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                var product = new ProductRow(
                    reader.GetGuid(0),
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetDecimal(3),
                    reader.GetString(4),
                    reader.GetFieldValue<string[]>(5));

                products.Add(product.Id, product);
            }
        }

        if (products.Count != productIds.Length)
        {
            throw new OrderValidationException(
                "One or more products are unavailable. Refresh the cart and try again.");
        }

        var pricedLines = new List<PricedLine>();
        decimal readySubtotal = 0;
        decimal preorderSubtotal = 0;

        foreach (var line in lines)
        {
            var product = products[line.ProductId];

            if (product.Sizes.Length == 0 && line.Size is not null)
            {
                throw new OrderValidationException(
                    $"{product.Name} does not have selectable sizes.");
            }

            if (product.Sizes.Length > 0 &&
                (line.Size is null ||
                 !product.Sizes.Contains(line.Size, StringComparer.OrdinalIgnoreCase)))
            {
                throw new OrderValidationException(
                    $"Choose a valid size for {product.Name}.");
            }

            var lineTotal = product.Price * line.Quantity;

            if (product.Status == "ready")
            {
                readySubtotal += lineTotal;
            }
            else
            {
                preorderSubtotal += lineTotal;
            }

            pricedLines.Add(new PricedLine(
                product,
                line.Quantity,
                line.Size,
                lineTotal));
        }

        var depositAmount = decimal.Round(
            preorderSubtotal * PreorderDepositPercent / 100m,
            2,
            MidpointRounding.AwayFromZero);

        var dueToday = readySubtotal + depositAmount;
        var balanceLater = preorderSubtotal - depositAmount;

        var orderId = Guid.NewGuid();
        var orderCode = $"ORD-{orderId:N}".ToUpperInvariant();
        var createdAt = DateTimeOffset.UtcNow;

        const string insertOrderSql = """
            INSERT INTO app_private.orders (
                id, order_code, firebase_uid,
                customer_full_name, customer_email, mobile_number,
                street_address, barangay, city_municipality, province, postal_code,
                delivery_notes, delivery_latitude, delivery_longitude,
                delivery_accuracy_meters,
                ready_subtotal, preorder_subtotal, deposit_percent,
                deposit_amount, due_today, balance_later,
                order_status, payment_status, is_test, created_at, updated_at
            )
            VALUES (
                @id, @order_code, @firebase_uid,
                @customer_full_name, @customer_email, @mobile_number,
                @street_address, @barangay, @city_municipality, @province, @postal_code,
                @delivery_notes, @delivery_latitude, @delivery_longitude,
                @delivery_accuracy_meters,
                @ready_subtotal, @preorder_subtotal, @deposit_percent,
                @deposit_amount, @due_today, @balance_later,
                'awaiting_payment', 'awaiting_submission', @is_test, @created_at, @created_at
            );
            """;

        await using (var orderCommand =
                     new NpgsqlCommand(insertOrderSql, connection, transaction))
        {
            orderCommand.Parameters.AddWithValue("id", orderId);
            orderCommand.Parameters.AddWithValue("order_code", orderCode);
            orderCommand.Parameters.AddWithValue("firebase_uid", firebaseUid);
            orderCommand.Parameters.AddWithValue(
                "customer_full_name", request.CustomerFullName.Trim());
            orderCommand.Parameters.AddWithValue(
                "customer_email", request.CustomerEmail.Trim());
            orderCommand.Parameters.AddWithValue(
                "mobile_number", request.MobileNumber.Trim());
            orderCommand.Parameters.AddWithValue(
                "street_address", request.StreetAddress.Trim());
            orderCommand.Parameters.AddWithValue(
                "barangay", request.Barangay.Trim());
            orderCommand.Parameters.AddWithValue(
                "city_municipality", request.CityMunicipality.Trim());
            orderCommand.Parameters.AddWithValue(
                "province", request.Province.Trim());
            orderCommand.Parameters.AddWithValue(
                "postal_code", request.PostalCode.Trim());

            orderCommand.Parameters.Add("delivery_notes", NpgsqlDbType.Text).Value =
                string.IsNullOrWhiteSpace(request.DeliveryNotes)
                    ? DBNull.Value
                    : request.DeliveryNotes.Trim();

            orderCommand.Parameters.AddWithValue(
                "delivery_latitude", request.DeliveryLatitude!.Value);
            orderCommand.Parameters.AddWithValue(
                "delivery_longitude", request.DeliveryLongitude!.Value);

            var accuracyValue = request.DeliveryAccuracyMeters.HasValue
                ? (object)Convert.ToDecimal(request.DeliveryAccuracyMeters.Value)
                : DBNull.Value;

            orderCommand.Parameters.Add(
                "delivery_accuracy_meters", NpgsqlDbType.Numeric).Value = accuracyValue;

            orderCommand.Parameters.AddWithValue("ready_subtotal", readySubtotal);
            orderCommand.Parameters.AddWithValue("preorder_subtotal", preorderSubtotal);
            orderCommand.Parameters.AddWithValue(
                "deposit_percent", PreorderDepositPercent);
            orderCommand.Parameters.AddWithValue("deposit_amount", depositAmount);
            orderCommand.Parameters.AddWithValue("due_today", dueToday);
            orderCommand.Parameters.AddWithValue("balance_later", balanceLater);
            orderCommand.Parameters.AddWithValue("created_at", createdAt);

            orderCommand.Parameters.AddWithValue("is_test", _isTest);

            await orderCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        const string insertItemSql = """
            INSERT INTO app_private.order_items (
                order_id, product_id, product_slug_snapshot,
                product_name_snapshot, fulfillment_status_snapshot,
                unit_price, quantity, size, line_total
            )
            VALUES (
                @order_id, @product_id, @product_slug_snapshot,
                @product_name_snapshot, @fulfillment_status_snapshot,
                @unit_price, @quantity, @size, @line_total
            );
            """;

        await using (var itemCommand =
                     new NpgsqlCommand(insertItemSql, connection, transaction))
        {
            foreach (var line in pricedLines)
            {
                itemCommand.Parameters.Clear();

                itemCommand.Parameters.AddWithValue("order_id", orderId);
                itemCommand.Parameters.AddWithValue("product_id", line.Product.Id);
                itemCommand.Parameters.AddWithValue(
                    "product_slug_snapshot", line.Product.Slug);
                itemCommand.Parameters.AddWithValue(
                    "product_name_snapshot", line.Product.Name);
                itemCommand.Parameters.AddWithValue(
                    "fulfillment_status_snapshot", line.Product.Status);
                itemCommand.Parameters.AddWithValue(
                    "unit_price", line.Product.Price);
                itemCommand.Parameters.AddWithValue("quantity", (short)line.Quantity);
                itemCommand.Parameters.Add("size", NpgsqlDbType.Text).Value =
                    (object?)line.Size ?? DBNull.Value;
                itemCommand.Parameters.AddWithValue("line_total", line.LineTotal);

                await itemCommand.ExecuteNonQueryAsync(cancellationToken);
            }
        }

        await transaction.CommitAsync(cancellationToken);

        return new CreateOrderResponse(
            orderId,
            orderCode,
            "awaiting_payment",
            "awaiting_submission",
            readySubtotal,
            preorderSubtotal,
            PreorderDepositPercent,
            depositAmount,
            dueToday,
            balanceLater,
            _isTest,
            createdAt);
    }

    private sealed record RequestedLine(Guid ProductId, int Quantity, string? Size);

    private sealed record ProductRow(
        Guid Id,
        string Slug,
        string Name,
        decimal Price,
        string Status,
        string[] Sizes);

    private sealed record PricedLine(
        ProductRow Product,
        int Quantity,
        string? Size,
        decimal LineTotal);
}

public sealed class OrderValidationException : Exception
{
    public OrderValidationException(string message) : base(message)
    {
    }
}