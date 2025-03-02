package kz.ai.sarbaz.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import kz.ai.sarbaz.api.dto.ChatDTO;
import kz.ai.sarbaz.api.dto.MessageDTO;
import kz.ai.sarbaz.entity.Chat;
import kz.ai.sarbaz.entity.Message;
import kz.ai.sarbaz.repository.ChatRepository;
import kz.ai.sarbaz.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DataExportService {

    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;
    private final ObjectMapper objectMapper;
    
    /**
     * Экспортирует все чаты в JSON-файл
     */
    public String exportChatsToJson() throws IOException {
        List<Chat> allChats = chatRepository.findAll();
        
        // Создаем имя файла с текущей датой и временем
        String fileName = "chats_export_" + getCurrentTimestamp() + ".json";
        Path exportPath = Paths.get("exports", fileName);
        
        // Создаем директорию, если она не существует
        Files.createDirectories(exportPath.getParent());
        
        // Записываем данные в файл
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(exportPath.toFile(), allChats);
        
        return exportPath.toString();
    }
    
    /**
     * Экспортирует все сообщения в JSON-файл
     */
    public String exportMessagesToJson() throws IOException {
        List<Message> allMessages = messageRepository.findAll();
        
        // Создаем имя файла с текущей датой и временем
        String fileName = "messages_export_" + getCurrentTimestamp() + ".json";
        Path exportPath = Paths.get("exports", fileName);
        
        // Создаем директорию, если она не существует
        Files.createDirectories(exportPath.getParent());
        
        // Записываем данные в файл
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(exportPath.toFile(), allMessages);
        
        return exportPath.toString();
    }
    
    /**
     * Экспортирует все сообщения в CSV-файл с указанными полями
     */
    public String exportMessagesToCSV() throws IOException {
        List<Message> allMessages = messageRepository.findAll();
        
        // Создаем имя файла с текущей датой и временем
        String fileName = "messages_export_" + getCurrentTimestamp() + ".csv";
        Path exportPath = Paths.get("exports", fileName);
        
        // Создаем директорию, если она не существует
        Files.createDirectories(exportPath.getParent());
        
        // Создаем схему CSV для необходимых полей
        List<MessageExportDTO> exportData = allMessages.stream()
                .map(message -> new MessageExportDTO(
                        message.getId(),
                        message.getChatId(),
                        message.getType().toString(),
                        message.getContent(),
                        message.getTimestamp().toString(),
                        message.getSequenceNumber()
                ))
                .collect(Collectors.toList());
        
        // Создаем CsvMapper и схему
        CsvMapper csvMapper = new CsvMapper();
        CsvSchema schema = csvMapper.schemaFor(MessageExportDTO.class).withHeader();
        
        // Записываем данные в файл
        csvMapper.writer(schema).writeValue(exportPath.toFile(), exportData);
        
        return exportPath.toString();
    }
    
    /**
     * Экспортирует сообщения конкретного чата в JSON-файл
     */
    public String exportChatMessagesToJson(String chatId) throws IOException {
        Page<Message> messages = messageRepository.findByChatIdOrderByTimestampAsc(chatId, Pageable.unpaged());
        
        // Создаем имя файла с текущей датой и временем
        String fileName = "chat_" + chatId + "_export_" + getCurrentTimestamp() + ".json";
        Path exportPath = Paths.get("exports", fileName);
        
        // Создаем директорию, если она не существует
        Files.createDirectories(exportPath.getParent());
        
        // Записываем данные в файл
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(exportPath.toFile(), messages.getContent());
        
        return exportPath.toString();
    }
    
    /**
     * Экспортирует данные для fine-tuning модели в формате JSONL (prompt/completion pairs)
     */
    public String exportForFineTuning() throws IOException {
        // Получаем все чаты
        List<Chat> allChats = chatRepository.findAll();
        List<FineTuningPair> pairs = new ArrayList<>();
        
        for (Chat chat : allChats) {
            // Получаем сообщения чата в порядке возрастания времени
            List<Message> chatMessages = messageRepository.findByChatIdOrderByTimestampAsc(
                    chat.getId(), Pageable.unpaged()).getContent();
            
            // Создаем пары prompt/completion
            for (int i = 0; i < chatMessages.size() - 1; i++) {
                if (chatMessages.get(i).getType() == Message.MessageType.USER && 
                    chatMessages.get(i+1).getType() == Message.MessageType.ASSISTANT) {
                    
                    FineTuningPair pair = new FineTuningPair(
                            chatMessages.get(i).getContent(),
                            chatMessages.get(i+1).getContent()
                    );
                    
                    pairs.add(pair);
                }
            }
        }
        
        // Создаем имя файла с текущей датой и временем
        String fileName = "finetuning_export_" + getCurrentTimestamp() + ".jsonl";
        Path exportPath = Paths.get("exports", fileName);
        
        // Создаем директорию, если она не существует
        Files.createDirectories(exportPath.getParent());
        
        // Записываем данные в файл в формате JSONL
        List<String> lines = new ArrayList<>();
        for (FineTuningPair pair : pairs) {
            lines.add(objectMapper.writeValueAsString(pair));
        }
        
        Files.write(exportPath, lines);
        
        return exportPath.toString();
    }
    
    private String getCurrentTimestamp() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
    }
    
    /**
     * DTO для экспорта сообщений в CSV
     */
    private static class MessageExportDTO {
        public String id;
        public String chatId;
        public String type;
        public String content;
        public String timestamp;
        public Integer sequenceNumber;
        
        public MessageExportDTO(String id, String chatId, String type, String content, String timestamp, Integer sequenceNumber) {
            this.id = id;
            this.chatId = chatId;
            this.type = type;
            this.content = content;
            this.timestamp = timestamp;
            this.sequenceNumber = sequenceNumber;
        }
    }
    
    /**
     * DTO для формата fine-tuning
     */
    private static class FineTuningPair {
        public String prompt;
        public String completion;
        
        public FineTuningPair(String prompt, String completion) {
            this.prompt = prompt;
            this.completion = completion;
        }
    }
}
