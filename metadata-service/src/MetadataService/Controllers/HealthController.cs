using MetadataService.Models;
using Microsoft.AspNetCore.Mvc;

namespace MetadataService.Controllers;

[ApiController]
[Route("health")]
[Produces("application/json")]
public class HealthController : ControllerBase
{
    private readonly HealthResponse _healthResponse;

    public HealthController(HealthResponse healthResponse)
    {
        _healthResponse = healthResponse;
    }

    [HttpGet]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public ActionResult<HealthResponse> GetHealth()
    {
        return Ok(_healthResponse);
    }
}
