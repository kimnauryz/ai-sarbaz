package kz.ai.sarbaz.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatDTO {
    private String id;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean active;
    private String modelName;
    private Integer messageCount;
}
