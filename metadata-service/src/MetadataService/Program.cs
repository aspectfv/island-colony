using MetadataService.Models;
using MetadataService.Serialization;
using MetadataService.Storage;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// Health / Contracts version
builder.Services.AddSingleton(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var configuredContractsVersion = configuration["CONTRACTS_VERSION"];
    var contractsVersion = string.IsNullOrWhiteSpace(configuredContractsVersion)
        ? Program.DefaultContractsVersion
        : configuredContractsVersion.Trim();

    return new HealthResponse
    {
        Status = "ok",
        Service = "metadata-service",
        ContractsVersion = contractsVersion
    };
});

// Storage
builder.Services.AddSingleton<ISessionRepository, InMemorySessionRepository>();

// CORS configuration
var allowedOriginsSetting = builder.Configuration["ALLOWED_ORIGINS"]
    ?? builder.Configuration["MetadataService:AllowedOrigins"]
    ?? "http://localhost:5173";

var allowedOrigins = allowedOriginsSetting
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Framework ProblemDetails customization (415, 404, 405, etc.)
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        var status = context.ProblemDetails.Status ?? context.HttpContext.Response.StatusCode;
        context.ProblemDetails.Status = status;
        context.ProblemDetails.Type = "about:blank";
        context.ProblemDetails.Extensions.Remove("traceId");
        if (!context.ProblemDetails.Extensions.ContainsKey("code"))
        {
            context.ProblemDetails.Extensions["code"] = ApiProblemDetails.CodeForStatus(status);
        }
    };
});

// Controllers, JSON serialization & Validation error mapping
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeOffsetJsonConverter());
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = new List<ValidationError>();
            foreach (var (key, state) in context.ModelState)
            {
                if (string.Equals(key, "request", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                bool isJsonPathKey = key == "$" || key.StartsWith("$.", StringComparison.Ordinal);

                foreach (var error in state.Errors)
                {
                    var fieldName = NormalizeFieldName(key);
                    bool isJsonError = isJsonPathKey || error.Exception is not null;
                    var message = isJsonError
                        ? "Invalid JSON value."
                        : string.IsNullOrWhiteSpace(error.ErrorMessage)
                            ? "Invalid field value."
                            : error.ErrorMessage;
                    errors.Add(new ValidationError(fieldName, message));
                }
            }

            if (errors.Count == 0)
            {
                errors.Add(new ValidationError("$", "Invalid JSON value."));
            }

            return ApiProblemDetails.ValidationFailed(errors).ToActionResult();
        };
    });

var app = builder.Build();

app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";
        var problem = ApiProblemDetails.InternalError();
        await context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json");
    });
});

app.UseStatusCodePages();
app.UseCors();
app.MapControllers();

app.Run();

static string NormalizeFieldName(string field)
{
    if (string.IsNullOrWhiteSpace(field) || field == "$")
    {
        return "$";
    }

    if (field.StartsWith("$.", StringComparison.Ordinal))
    {
        field = field[2..];
    }

    // Lower-case the first letter of each property segment (ASP.NET reports member names in PascalCase),
    // but leave dictionary keys inside ["..."] exactly as the client sent them, including any dots.
    var result = new System.Text.StringBuilder(field.Length);
    bool atSegmentStart = true;
    bool inQuotedKey = false;
    for (int i = 0; i < field.Length; i++)
    {
        char c = field[i];

        if (inQuotedKey)
        {
            result.Append(c);
            if (c == '"' && i + 1 < field.Length && field[i + 1] == ']')
            {
                inQuotedKey = false;
            }
            continue;
        }

        if (c == '[' && i + 1 < field.Length && field[i + 1] == '"')
        {
            inQuotedKey = true;
            result.Append("[\"");
            i++;
            atSegmentStart = false;
            continue;
        }

        if (c == '.')
        {
            atSegmentStart = true;
            result.Append(c);
            continue;
        }

        result.Append(atSegmentStart ? char.ToLowerInvariant(c) : c);
        atSegmentStart = false;
    }

    return result.ToString();
}

public partial class Program
{
    public const string DefaultContractsVersion = "1.0.1";
}
