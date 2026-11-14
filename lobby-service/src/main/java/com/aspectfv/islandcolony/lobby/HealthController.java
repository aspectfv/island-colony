package com.aspectfv.islandcolony.lobby;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

  private final String contractsVersion = readContractsVersion();

  @GetMapping("/health")
  public Map<String, Object> health() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", "ok");
    body.put("service", "lobby-service");
    body.put("contractsVersion", contractsVersion);
    return body;
  }

  /** Copied from contracts/VERSION at build time. A missing file fails startup. */
  private static String readContractsVersion() {
    try (InputStream in = new ClassPathResource("contracts/VERSION").getInputStream()) {
      return new String(in.readAllBytes(), StandardCharsets.UTF_8).strip();
    } catch (IOException e) {
      throw new IllegalStateException("contracts/VERSION is missing from the classpath", e);
    }
  }
}
