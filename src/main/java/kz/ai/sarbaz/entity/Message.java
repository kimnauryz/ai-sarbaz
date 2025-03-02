package kz.ai.sarbaz.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "messages")
public class Message {
    @Id
    private String id;
    
    @Indexed
    private String chatId;
    
    private MessageType type;
    private String content;
    private LocalDateTime timestamp;
    private List<MediaAttachment> attachments;
    private Integer sequenceNumber;
    
    public enum MessageType {
        USER,
        ASSISTANT,
        SYSTEM
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MediaAttachment {
        private String filename;
        private String contentType;
        private String dataRef; // Ссылка на GridFS или другое хранилище
    }
}
