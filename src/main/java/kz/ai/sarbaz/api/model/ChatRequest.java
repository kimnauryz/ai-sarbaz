package kz.ai.sarbaz.api.model;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Data
public class ChatRequest {
    private String model;
    private String prompt;
    private String chatId;
    private List<MultipartFile> attachments;
}
