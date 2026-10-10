using MetadataService.Models;
using Microsoft.AspNetCore.Mvc;

namespace MetadataService.Controllers;

[ApiController]
[Route("health")]
[Produces("application/json")]
public class HealthController : ControllerBase
{
    private readonly string _contractsVersion;

    public HealthController(IConfiguration configuration)
    {
        string? configuredVersion = configuration["MetadataService:ContractsVersion"]
            ?? configuration["CONTRACTS_VERSION"];

        if (!string.IsNullOrWhiteSpace(configuredVersion))
        {
            _contractsVersion = configuredVersion.Trim();
        }
        else
        {
            _contractsVersion = ResolveContractsVersionFromDisk() ?? "1.0.1";
        }
    }

    [HttpGet]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public ActionResult<HealthResponse> GetHealth()
    {
        return Ok(new HealthResponse
        {
            Status = "ok",
            Service = "metadata-service",
            ContractsVersion = _contractsVersion
        });
    }

    private static string? ResolveContractsVersionFromDisk()
    {
        try
        {
            var searchPaths = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "contracts", "VERSION"),
                Path.Combine(Directory.GetCurrentDirectory(), "contracts", "VERSION"),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "contracts", "VERSION"),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "contracts", "VERSION"),
            };

            foreach (var path in searchPaths)
            {
                if (System.IO.File.Exists(path))
                {
                    var version = System.IO.File.ReadAllText(path).Trim();
                    if (!string.IsNullOrEmpty(version))
                    {
                        return version;
                    }
                }
            }
        }
        catch
        {
            // Ignore filesystem access exceptions and use default
        }

        return null;
    }
}
