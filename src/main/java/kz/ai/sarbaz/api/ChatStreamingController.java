package kz.ai.sarbaz.api;

import kz.ai.sarbaz.entity.Chat;
import kz.ai.sarbaz.entity.Message;
import kz.ai.sarbaz.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.InMemoryChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.SystemPromptTemplate;
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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/chat/streaming")
@RequiredArgsConstructor
@Slf4j
public class ChatStreamingController {

    @Qualifier("ollamaChatClient")
    private final ChatClient ollamaChatClient;
    private final ChatService chatService;

    // Maximum number of previous messages for context
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
            @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments) {

        // Generate a messageId for tracking this conversation
        final String messageId = UUID.randomUUID().toString();
        log.info("Starting streaming response for message: {}", messageId);

        try {
            // Get or create chat
            Chat chat = chatService.getOrCreateChat(chatId, model);
            final String finalChatId = chat.getId();

            // Create system prompt template
            SystemPromptTemplate systemPromptTemplate = new SystemPromptTemplate(
                    "You are a friendly chat bot that answers question in the role of a {role}."
            );

            SystemMessage systemMessage = (SystemMessage) systemPromptTemplate.createMessage(Map.of("role", role));

            // Create user message
            UserMessage userMessage = new UserMessage(prompt);

            // Add attachments if they exist
            if (attachments != null && !attachments.isEmpty()) {
                List<Media> mediaList = new ArrayList<>();
                for (MultipartFile file : attachments) {
                    try {
                        Media media = Media.builder()
                                .data(file.getBytes())
                                .mimeType(MimeType.valueOf(file.getContentType()))
                                .build();
                        mediaList.add(media);
                    } catch (IOException e) {
                        log.error("Error processing attachment: {}", e.getMessage(), e);
                    }
                }
                userMessage.getMedia().addAll(mediaList);
            }

            // Create message list for the prompt
            InMemoryChatMemory inMemoryChatMemory = new InMemoryChatMemory();
            inMemoryChatMemory.add(chatId, systemMessage);

            // Add history if chat already exists
            if (chatService.chatExists(chat.getId())) {
                List<Message> history = chatService.getLastMessages(chat.getId(), MAX_HISTORY_MESSAGES);

                // Convert history to LLM messages
                history.forEach(msg -> {
                    if (msg.getType() == Message.MessageType.USER) {
                        inMemoryChatMemory.add(chatId, new UserMessage(msg.getContent()));
                    } else if (msg.getType() == Message.MessageType.ASSISTANT) {
                        inMemoryChatMemory.add(chatId, new AssistantMessage(msg.getContent()));
                    }
                });
            }

            // Set options for model
            OllamaOptions options = OllamaOptions.builder()
                    .model(model)
                    .build();

            // Save user message
            chatService.saveUserMessage(finalChatId, prompt, attachments);

            // Create the prompt with options
            Prompt promptWithOptions = new Prompt(userMessage, options);

            // Create a StringBuilder to accumulate the response
            StringBuilder responseBuilder = new StringBuilder();

            // Stream the response
            return ollamaChatClient.prompt(promptWithOptions)
                    .advisors(new MessageChatMemoryAdvisor(inMemoryChatMemory))
                    .stream().chatResponse()
                    .map(response -> {
                        String content = response.getResult().getOutput().getText();
                        responseBuilder.append(content);

                        return ServerSentEvent.<String>builder()
                                .id(messageId)
                                .event("message")
                                .data(content)
                                .build();
                    })
                    .timeout(Duration.ofMinutes(5))
                    .doOnComplete(() -> {
                        // When streaming is complete, save the full message
                        String fullResponse = responseBuilder.toString();
                        chatService.saveAssistantMessage(finalChatId, fullResponse);
                        log.info("Streaming completed for message: {}", messageId);
                    })
                    .doOnError(e -> {
                        log.error("Error during streaming response: {}", e.getMessage(), e);

                        // In case of error, save what we have so far
                        if (responseBuilder.length() > 0) {
                            chatService.saveAssistantMessage(finalChatId, responseBuilder.toString());
                        }
                    })
                    .onErrorResume(e -> {
                        return Flux.just(ServerSentEvent.<String>builder()
                                .id(messageId)
                                .event("error")
                                .data("Error: " + e.getMessage())
                                .build());
                    });
        } catch (Exception e) {
            log.error("Error initializing streaming: {}", e.getMessage(), e);

            return Flux.just(ServerSentEvent.<String>builder()
                    .id(messageId)
                    .event("error")
                    .data("Error: " + e.getMessage())
                    .build());
        }
    }

    /**
     * Stream a heartbeat event to keep the connection alive
     */
    @GetMapping(value = "/heartbeat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> heartbeat() {
        return Flux.interval(Duration.ofSeconds(15))
                .map(sequence -> ServerSentEvent.<String>builder()
                        .id(String.valueOf(sequence))
                        .event("heartbeat")
                        .data("ping")
                        .build());
    }
}