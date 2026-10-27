package com.aspectfv.islandcolony.lobby;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

  @Value("${contracts.version:1.0.1}")
  private String contractsVersion;

  @GetMapping("/health")
  public Map<String, Object> health() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", "ok");
    body.put("service", "lobby-service");
    body.put("contractsVersion", contractsVersion);
    return body;
  }
}
