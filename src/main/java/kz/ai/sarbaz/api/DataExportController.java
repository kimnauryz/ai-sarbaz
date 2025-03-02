package kz.ai.sarbaz.api;

import kz.ai.sarbaz.service.DataExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class DataExportController {

    private final DataExportService dataExportService;
    
    /**
     * Экспорт чатов в JSON
     */
    @GetMapping("/chats/json")
    public ResponseEntity<Map<String, String>> exportChatsToJson() {
        try {
            String filePath = dataExportService.exportChatsToJson();
            return ResponseEntity.ok(Map.of("status", "success", "filePath", filePath));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
    
    /**
     * Экспорт сообщений в JSON
     */
    @GetMapping("/messages/json")
    public ResponseEntity<Map<String, String>> exportMessagesToJson() {
        try {
            String filePath = dataExportService.exportMessagesToJson();
            return ResponseEntity.ok(Map.of("status", "success", "filePath", filePath));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
    
    /**
     * Экспорт сообщений в CSV
     */
    @GetMapping("/messages/csv")
    public ResponseEntity<Map<String, String>> exportMessagesToCSV() {
        try {
            String filePath = dataExportService.exportMessagesToCSV();
            return ResponseEntity.ok(Map.of("status", "success", "filePath", filePath));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
    
    /**
     * Экспорт сообщений конкретного чата
     */
    @GetMapping("/chat/{chatId}")
    public ResponseEntity<Map<String, String>> exportChatMessages(@PathVariable String chatId) {
        try {
            String filePath = dataExportService.exportChatMessagesToJson(chatId);
            return ResponseEntity.ok(Map.of("status", "success", "filePath", filePath));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
    
    /**
     * Экспорт данных для fine-tuning
     */
    @GetMapping("/finetuning")
    public ResponseEntity<Map<String, String>> exportForFineTuning() {
        try {
            String filePath = dataExportService.exportForFineTuning();
            return ResponseEntity.ok(Map.of("status", "success", "filePath", filePath));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
}
