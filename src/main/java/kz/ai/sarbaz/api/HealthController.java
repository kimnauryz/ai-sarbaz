package kz.ai.sarbaz.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/chat")
public class HealthController {

    /**
     * Simple health check endpoint for connection testing
     * Used by the frontend to verify connectivity for streaming
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }
}
