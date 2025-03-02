package kz.ai.sarbaz.service;

import kz.ai.sarbaz.api.dto.ChatDTO;
import kz.ai.sarbaz.api.dto.MessageDTO;
import kz.ai.sarbaz.api.dto.PageResponse;
import kz.ai.sarbaz.entity.Chat;
import kz.ai.sarbaz.entity.Message;
import kz.ai.sarbaz.entity.Message.MessageType;
import kz.ai.sarbaz.repository.ChatRepository;
import kz.ai.sarbaz.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {
    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;
    private final FileStorageService fileStorageService;

    /**
     * Получить или создать чат по ID
     */
    public Chat getOrCreateChat(String chatId, String modelName) {
        if (chatId == null || chatId.isEmpty()) {
            // Создаем новый чат
            return createNewChat(modelName);
        }

        // Пытаемся найти существующий чат
        Optional<Chat> existingChat = chatRepository.findById(chatId);

        return existingChat.orElseGet(() -> createNewChat(modelName));
    }

    /**
     * Создать новый чат
     */
    public Chat createNewChat(String modelName) {
        Chat newChat = Chat.builder()
                .id(UUID.randomUUID().toString())
                .title("Новый чат")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .active(true)
                .modelName(modelName)
                .messageCount(0)
                .build();

        return chatRepository.save(newChat);
    }

    /**
     * Сохранить сообщение пользователя
     */
    public Message saveUserMessage(String chatId, String content, List<MultipartFile> attachments) {
        // Обновляем информацию о чате
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        Chat chat = chatOpt.orElseThrow(() -> new RuntimeException("Чат не найден"));

        chat.setUpdatedAt(LocalDateTime.now());
        chat.setMessageCount(chat.getMessageCount() + 1);
        chatRepository.save(chat);

        // Создаем сообщение
        Message message = Message.builder()
                .id(UUID.randomUUID().toString())
                .chatId(chatId)
                .type(MessageType.USER)
                .content(content)
                .timestamp(LocalDateTime.now())
                .sequenceNumber(chat.getMessageCount())
                .attachments(new ArrayList<>())
                .build();

        // Сохраняем вложения, если они есть
        if (attachments != null && !attachments.isEmpty()) {
            List<Message.MediaAttachment> mediaAttachments = new ArrayList<>();

            for (MultipartFile file : attachments) {
                String fileRef = fileStorageService.storeFile(file);

                Message.MediaAttachment attachment = Message.MediaAttachment.builder()
                        .filename(file.getOriginalFilename())
                        .contentType(file.getContentType())
                        .dataRef(fileRef)
                        .build();

                mediaAttachments.add(attachment);
            }

            message.setAttachments(mediaAttachments);
        }

        return messageRepository.save(message);
    }

    /**
     * Сохранить ответ ассистента
     */
    public Message saveAssistantMessage(String chatId, String content) {
        // Обновляем информацию о чате
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        Chat chat = chatOpt.orElseThrow(() -> new RuntimeException("Чат не найден"));

        chat.setUpdatedAt(LocalDateTime.now());
        chat.setMessageCount(chat.getMessageCount() + 1);
        chatRepository.save(chat);

        // Создаем сообщение
        Message message = Message.builder()
                .id(UUID.randomUUID().toString())
                .chatId(chatId)
                .type(MessageType.ASSISTANT)
                .content(content)
                .timestamp(LocalDateTime.now())
                .sequenceNumber(chat.getMessageCount())
                .attachments(new ArrayList<>())
                .build();

        return messageRepository.save(message);
    }

    /**
     * Получить страницу сообщений чата
     */
    public PageResponse<MessageDTO> getChatMessages(String chatId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "timestamp"));
        Page<Message> messagePage = messageRepository.findByChatIdOrderByTimestampAsc(chatId, pageable);

        List<MessageDTO> messageDTOs = messagePage.getContent().stream()
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());

        return PageResponse.<MessageDTO>builder()
                .content(messageDTOs)
                .page(messagePage.getNumber())
                .size(messagePage.getSize())
                .totalElements(messagePage.getTotalElements())
                .totalPages(messagePage.getTotalPages())
                .first(messagePage.isFirst())
                .last(messagePage.isLast())
                .build();
    }

    /**
     * Получить последние N сообщений из чата для контекста
     */
    public List<Message> getLastMessages(String chatId, int limit) {
        return messageRepository.findByChatIdOrderBySequenceNumberDesc(chatId, PageRequest.of(0, limit));
    }

    /**
     * Получить список чатов с пагинацией
     */
    public PageResponse<ChatDTO> getChats(int page, int size, boolean activeOnly) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));

        Page<Chat> chatPage;
        if (activeOnly) {
            chatPage = chatRepository.findByActiveTrueOrderByUpdatedAtDesc(pageable);
        } else {
            chatPage = chatRepository.findAllByOrderByUpdatedAtDesc(pageable);
        }

        List<ChatDTO> chatDTOs = chatPage.getContent().stream()
                .map(this::convertToChatDTO)
                .collect(Collectors.toList());

        return PageResponse.<ChatDTO>builder()
                .content(chatDTOs)
                .page(chatPage.getNumber())
                .size(chatPage.getSize())
                .totalElements(chatPage.getTotalElements())
                .totalPages(chatPage.getTotalPages())
                .first(chatPage.isFirst())
                .last(chatPage.isLast())
                .build();
    }

    /**
     * Обновить название чата
     */
    public ChatDTO updateChatTitle(String chatId, String title) {
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        Chat chat = chatOpt.orElseThrow(() -> new RuntimeException("Чат не найден"));

        chat.setTitle(title);
        chat.setUpdatedAt(LocalDateTime.now());

        Chat savedChat = chatRepository.save(chat);
        return convertToChatDTO(savedChat);
    }

    /**
     * Архивировать чат
     */
    public void archiveChat(String chatId) {
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        Chat chat = chatOpt.orElseThrow(() -> new RuntimeException("Чат не найден"));

        chat.setActive(false);
        chat.setUpdatedAt(LocalDateTime.now());

        chatRepository.save(chat);
    }

    /**
     * Проверка существования чата
     */
    public boolean chatExists(String chatId) {
        return chatRepository.existsById(chatId);
    }

    /**
     * Удалить чат
     */
    public void deleteChat(String chatId) {
        chatRepository.deleteById(chatId);
        // Удаляем все сообщения чата
        List<Message> messages = messageRepository.findByChatIdOrderByTimestampAsc(chatId, Pageable.unpaged()).getContent();

        // Удаляем все файлы, связанные с сообщениями
        for (Message message : messages) {
            if (message.getAttachments() != null) {
                for (Message.MediaAttachment attachment : message.getAttachments()) {
                    fileStorageService.deleteFile(attachment.getDataRef());
                }
            }
        }

        messageRepository.deleteAll(messages);
    }

    // Конвертеры сущностей в DTO
    private MessageDTO convertToMessageDTO(Message message) {
        List<MessageDTO.AttachmentDTO> attachmentDTOs = new ArrayList<>();

        if (message.getAttachments() != null) {
            attachmentDTOs = message.getAttachments().stream()
                    .map(attachment -> MessageDTO.AttachmentDTO.builder()
                            .filename(attachment.getFilename())
                            .contentType(attachment.getContentType())
                            .build())
                    .collect(Collectors.toList());
        }

        return MessageDTO.builder()
                .id(message.getId())
                .chatId(message.getChatId())
                .type(message.getType())
                .content(message.getContent())
                .timestamp(message.getTimestamp())
                .attachments(attachmentDTOs)
                .build();
    }

    private ChatDTO convertToChatDTO(Chat chat) {
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