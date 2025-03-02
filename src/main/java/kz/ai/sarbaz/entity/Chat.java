package kz.ai.sarbaz.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "chats")
public class Chat {
    @Id
    private String id;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean active;
    private String modelName;
    private Integer messageCount;
}
