package kz.ai.sarbaz.api.dto;

import kz.ai.sarbaz.entity.Message.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageDTO {
    private String id;
    private String chatId;
    private MessageType type;
    private String content;
    private LocalDateTime timestamp;
    private List<AttachmentDTO> attachments;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttachmentDTO {
        private String filename;
        private String contentType;
    }
}
