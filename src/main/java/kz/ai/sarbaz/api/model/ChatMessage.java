package kz.ai.sarbaz.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    private String id;
    private String chatId;
    private MessageType type;
    private String content;
    private LocalDateTime timestamp;
    
    public enum MessageType {
        USER,
        ASSISTANT
    }
}
