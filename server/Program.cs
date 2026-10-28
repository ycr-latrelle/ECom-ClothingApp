using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Authentication;
using Npgsql;
using server.Api.Authentication;
using server.Api.Data;

var builder = WebApplication.CreateBuilder(args);

const string ClientCorsPolicy = "ClientCorsPolicy";

builder.Services.AddCors(options =>
{
    options.AddPolicy(ClientCorsPolicy, policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "https://thread-theory-gray.vercel.app")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var firebaseProjectId = builder.Configuration["Firebase:ProjectId"];
var serviceAccountPath = builder.Configuration["Firebase:ServiceAccountPath"];

if (string.IsNullOrWhiteSpace(firebaseProjectId))
{
    throw new InvalidOperationException("Firebase:ProjectId is missing.");
}

if (string.IsNullOrWhiteSpace(serviceAccountPath))
{
    throw new InvalidOperationException("Firebase:ServiceAccountPath is missing.");
}

var fullServiceAccountPath = Path.IsPathRooted(serviceAccountPath)
    ? serviceAccountPath
    : Path.Combine(builder.Environment.ContentRootPath, serviceAccountPath);

FirebaseApp.Create(new AppOptions
{
    Credential = CredentialFactory
        .FromFile<ServiceAccountCredential>(fullServiceAccountPath)
        .ToGoogleCredential(),
    ProjectId = firebaseProjectId
});

var supabaseConnectionString =
    builder.Configuration.GetConnectionString("Supabase");

if (string.IsNullOrWhiteSpace(supabaseConnectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:Supabase is missing.");
}

builder.Services.AddSingleton<NpgsqlDataSource>(_ =>
{
    var dataSourceBuilder =
        new NpgsqlDataSourceBuilder(supabaseConnectionString);

    return dataSourceBuilder.Build();
});

builder.Services.AddScoped<CustomerProfileRepository>();
builder.Services.AddSingleton(FirebaseAuth.DefaultInstance);

builder.Services
    .AddAuthentication("Firebase")
    .AddScheme<AuthenticationSchemeOptions, FirebaseAuthenticationHandler>(
        "Firebase",
        _ => { });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors(ClientCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();