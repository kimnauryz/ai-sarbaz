package kz.ai.sarbaz.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StreamingChatResponse {
    private String messageId;
    private String chatId;
    private String content;
    private boolean done;
}