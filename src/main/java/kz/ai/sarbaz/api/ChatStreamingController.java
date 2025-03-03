package kz.ai.sarbaz.api;

import kz.ai.sarbaz.entity.Chat;
import kz.ai.sarbaz.entity.Message;
import kz.ai.sarbaz.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.model.Media;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.util.MimeType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/chat/streaming")
@RequiredArgsConstructor
@Slf4j
public class ChatStreamingController {

    @Qualifier("ollamaChatClient")
    private final ChatClient ollamaChatClient;
    private final ChatService chatService;

    // Максимальное количество предыдущих сообщений для контекста
    private static final int MAX_HISTORY_MESSAGES = 10;

    /**
     * Stream a response from the LLM.
     * This endpoint uses Server-Sent Events to stream the response as it's generated.
     */
    @PostMapping(value = "/prompt", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamPrompt(
            @RequestPart("model") String model,
            @RequestPart("prompt") String prompt,
            @RequestPart("role") String role,
            @RequestPart(value = "chatId", required = false) String chatId,
            @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments) throws IOException {

        // Generate a messageId for tracking this conversation
        final String messageId = UUID.randomUUID().toString();

        // Get or create chat
        Chat chat = chatService.getOrCreateChat(chatId, model);
        final String finalChatId = chat.getId();

        // Create new user message
        UserMessage currentUserMessage = new UserMessage(prompt);

        // Add attachments, if they exist
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

        // Create system message with role
        SystemMessage systemMessage = new SystemMessage("You are a friendly chat bot that answers question in the role of a " + role);

        // Get chat history and transform to messages for LLM
        List<org.springframework.ai.chat.messages.Message> messageHistory = new ArrayList<>();
        messageHistory.add(systemMessage);

        // Add history if chat already exists
        if (chatService.chatExists(chat.getId())) {
            List<Message> history = chatService.getLastMessages(chat.getId(), MAX_HISTORY_MESSAGES);

            // Convert history to LLM messages
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

        // Add current user message
        messageHistory.add(currentUserMessage);

        // Set options for model
        OllamaOptions options = OllamaOptions.builder()
                .model(model)
                .build();

        // Save user message
        chatService.saveUserMessage(finalChatId, prompt, attachments);

        // Create a StringBuilder to accumulate the full response
        final StringBuilder fullResponseBuilder = new StringBuilder();

        // Stream the LLM response
        return ollamaChatClient.prompt()
                .options(options)
                .messages(messageHistory)
                .stream().chatResponse()
                .map(response -> {

                    String content = response.getResult().getOutput().getText();
                    fullResponseBuilder.append(content);

                    return ServerSentEvent.<String>builder()
                            .id(messageId)
                            .event("message")
                            .data(content)
                            .build();
                })
                .timeout(Duration.ofMinutes(5))
                .doOnComplete(() -> {
                    // When streaming is complete, save the full message to the database
                    String fullResponse = fullResponseBuilder.toString();
                    chatService.saveAssistantMessage(finalChatId, fullResponse);
                    log.info("Streaming completed for message: {}", messageId);
                })
                .doOnError(e -> {
                    log.error("Error during streaming response: {}", e.getMessage(), e);
                    // In case of error, save what we have so far
                    if (!fullResponseBuilder.isEmpty()) {
                        chatService.saveAssistantMessage(finalChatId, fullResponseBuilder.toString());
                    }
                });
    }
}