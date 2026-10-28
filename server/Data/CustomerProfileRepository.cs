using Npgsql;
using NpgsqlTypes;
using server.Api.Models;

namespace server.Api.Data;

public sealed class CustomerProfileRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public CustomerProfileRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<CustomerProfileRequest?> GetByFirebaseUidAsync(
        string firebaseUid,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT first_name, middle_name, last_name, age, gender,
                   street_address, barangay, city_municipality, province, postal_code
            FROM app_private.customer_profiles
            WHERE firebase_uid = @firebase_uid;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("firebase_uid", firebaseUid);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new CustomerProfileRequest
        {
            FirstName = reader.GetString(0),
            MiddleName = reader.IsDBNull(1) ? null : reader.GetString(1),
            LastName = reader.GetString(2),
            Age = reader.GetInt16(3),
            Gender = reader.GetString(4),
            StreetAddress = reader.GetString(5),
            Barangay = reader.GetString(6),
            CityMunicipality = reader.GetString(7),
            Province = reader.GetString(8),
            PostalCode = reader.GetString(9)
        };
    }

    public async Task SaveAsync(
        string firebaseUid,
        CustomerProfileRequest profile,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO app_private.customer_profiles (
                firebase_uid, first_name, middle_name, last_name, age, gender,
                street_address, barangay, city_municipality, province, postal_code
            )
            VALUES (
                @firebase_uid, @first_name, @middle_name, @last_name, @age, @gender,
                @street_address, @barangay, @city_municipality, @province, @postal_code
            )
            ON CONFLICT (firebase_uid) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                middle_name = EXCLUDED.middle_name,
                last_name = EXCLUDED.last_name,
                age = EXCLUDED.age,
                gender = EXCLUDED.gender,
                street_address = EXCLUDED.street_address,
                barangay = EXCLUDED.barangay,
                city_municipality = EXCLUDED.city_municipality,
                province = EXCLUDED.province,
                postal_code = EXCLUDED.postal_code,
                updated_at = NOW();
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("firebase_uid", firebaseUid);
        command.Parameters.AddWithValue("first_name", profile.FirstName);
        command.Parameters.AddWithValue(
            "middle_name",
            (object?)profile.MiddleName ?? DBNull.Value);
        command.Parameters.AddWithValue("last_name", profile.LastName);
        command.Parameters.Add("age", NpgsqlDbType.Smallint).Value = (short)profile.Age;
        command.Parameters.AddWithValue("gender", profile.Gender);
        command.Parameters.AddWithValue("street_address", profile.StreetAddress);
        command.Parameters.AddWithValue("barangay", profile.Barangay);
        command.Parameters.AddWithValue("city_municipality", profile.CityMunicipality);
        command.Parameters.AddWithValue("province", profile.Province);
        command.Parameters.AddWithValue("postal_code", profile.PostalCode);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}