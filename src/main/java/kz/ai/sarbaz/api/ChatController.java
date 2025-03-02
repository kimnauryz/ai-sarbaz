package kz.ai.sarbaz.api;

import kz.ai.sarbaz.api.dto.ChatDTO;
import kz.ai.sarbaz.api.dto.MessageDTO;
import kz.ai.sarbaz.api.dto.PageResponse;
import kz.ai.sarbaz.api.model.ChatResponse;
import kz.ai.sarbaz.entity.Chat;
import kz.ai.sarbaz.entity.Message;
import kz.ai.sarbaz.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.model.Media;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MimeType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    @Qualifier("ollamaChatClient")
    private final ChatClient ollamaChatClient;
    private final ChatService chatService;

    // Максимальное количество предыдущих сообщений для контекста
    private static final int MAX_HISTORY_MESSAGES = 10;

    @GetMapping("/llama/ask")
    public Map<String, String> ask(@RequestParam(value = "message", defaultValue = "Introduce you as best helper of humanity") String message,
                                   @RequestParam(name = "role", defaultValue = "ai") String role) {
        return Map.of("completion", ollamaChatClient.prompt()
                .system(sp -> sp.param("role", role))
                .user(message)
                .call().content());
    }

    @PostMapping(value = "/prompt")
    public ChatResponse processPrompt(
            @RequestPart("model") String model,
            @RequestPart("prompt") String prompt,
            @RequestPart("role") String role,
            @RequestPart(value = "chatId", required = false) String chatId,
            @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments) throws IOException {

        // Получаем или создаем чат
        Chat chat = chatService.getOrCreateChat(chatId, model);

        // Создаем новое сообщение пользователя
        UserMessage currentUserMessage = new UserMessage(prompt);

        // Добавляем вложения, если они есть
        if (attachments != null && !attachments.isEmpty()) {
            List<Media> mediaList = new ArrayList<>();
            for (MultipartFile file : attachments) {
                Media media = Media.builder()
                        .data(file.getBytes())
                        .mimeType(MimeType.valueOf(file.getContentType()))
                        .build();
                mediaList.add(media);
            }
            currentUserMessage.getMedia().addAll(mediaList);
        }

        // Создаем системное сообщение с ролью
        SystemMessage systemMessage = new SystemMessage("You are a friendly chat bot that answers question in the role of a " + role);

        // Получаем историю чата и преобразуем в сообщения для LLM
        List<org.springframework.ai.chat.messages.Message> messageHistory = new ArrayList<>();
        messageHistory.add(systemMessage);

        // Добавляем историю, если чат уже существует
        if (chatService.chatExists(chat.getId())) {
            List<Message> history = chatService.getLastMessages(chat.getId(), MAX_HISTORY_MESSAGES);

            // Преобразуем историю в сообщения для LLM
            List<org.springframework.ai.chat.messages.Message> historyMessages = history.stream()
                    .map(msg -> {
                        if (msg.getType() == Message.MessageType.USER) {
                            return new UserMessage(msg.getContent());
                        } else {
                            return new AssistantMessage(msg.getContent());
                        }
                    })
                    .collect(Collectors.toList());

            messageHistory.addAll(historyMessages);
        }

        // Добавляем текущее сообщение пользователя
        messageHistory.add(currentUserMessage);

        // Настраиваем options для модели
        OllamaOptions options = OllamaOptions.builder()
                .model(model)
                .build();

        // Отправляем запрос к LLM и получаем ответ
        String completion = this.ollamaChatClient.prompt()
                .options(options)
                .messages(messageHistory)
                .call().content();

        // Сохраняем сообщение пользователя и ответ в истории
        chatService.saveUserMessage(chat.getId(), prompt, attachments);
        chatService.saveAssistantMessage(chat.getId(), completion);

        // Возвращаем ответ
        return ChatResponse.builder()
                .chatId(chat.getId())
                .completion(completion)
                .build();
    }

    // Управление чатами

    /**
     * Получить список чатов с пагинацией
     */
    @GetMapping("/chats")
    public PageResponse<ChatDTO> getChats(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "true") boolean activeOnly) {

        return chatService.getChats(page, size, activeOnly);
    }

    /**
     * Получить историю чата с пагинацией
     */
    @GetMapping("/history/{chatId}")
    public PageResponse<MessageDTO> getChatHistory(
            @PathVariable String chatId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return chatService.getChatMessages(chatId, page, size);
    }

    /**
     * Обновить название чата
     */
    @PutMapping("/chats/{chatId}/title")
    public ChatDTO updateChatTitle(
            @PathVariable String chatId,
            @RequestBody Map<String, String> request) {

        String title = request.get("title");
        if (title == null || title.isEmpty()) {
            throw new IllegalArgumentException("Название чата не может быть пустым");
        }

        return chatService.updateChatTitle(chatId, title);
    }

    /**
     * Архивировать чат
     */
    @PutMapping("/chats/{chatId}/archive")
    public ResponseEntity<Void> archiveChat(@PathVariable String chatId) {
        chatService.archiveChat(chatId);
        return ResponseEntity.ok().build();
    }

    /**
     * Удалить чат
     */
    @DeleteMapping("/chats/{chatId}")
    public ResponseEntity<Void> deleteChat(@PathVariable String chatId) {
        chatService.deleteChat(chatId);
        return ResponseEntity.ok().build();
    }

    /**
     * Создать новый пустой чат
     */
    @PostMapping("/chats")
    public ChatDTO createNewChat(@RequestBody Map<String, String> request) {
        String modelName = request.getOrDefault("model", "llama3.2:3b");
        Chat chat = chatService.createNewChat(modelName);
        return ChatDTO.builder()
                .id(chat.getId())
                .title(chat.getTitle())
                .createdAt(chat.getCreatedAt())
                .updatedAt(chat.getUpdatedAt())
                .active(chat.getActive())
                .modelName(chat.getModelName())
                .messageCount(chat.getMessageCount())
                .build();
    }
}