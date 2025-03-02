package kz.ai.sarbaz.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.file-storage-path:./uploads}")
    private String fileStoragePath;
    
    private Path getStorageLocation() {
        Path storagePath = Paths.get(fileStoragePath).toAbsolutePath().normalize();
        
        try {
            if (!Files.exists(storagePath)) {
                Files.createDirectories(storagePath);
            }
            return storagePath;
        } catch (IOException ex) {
            throw new RuntimeException("Не удалось создать директорию для хранения файлов", ex);
        }
    }
    
    /**
     * Сохраняет файл и возвращает ссылку на него
     */
    public String storeFile(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("Нельзя сохранить пустой файл");
            }
            
            // Генерируем уникальное имя файла
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String fileExtension = "";
            
            if (originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            
            // Создаем путь для сохранения
            Path targetLocation = getStorageLocation().resolve(uniqueFilename);
            
            // Копируем файл
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            // Возвращаем уникальное имя файла как ссылку
            return uniqueFilename;
        } catch (IOException ex) {
            throw new RuntimeException("Не удалось сохранить файл", ex);
        }
    }
    
    /**
     * Загружает файл по ссылке
     */
    public byte[] loadFile(String fileRef) {
        try {
            Path filePath = getStorageLocation().resolve(fileRef).normalize();
            return Files.readAllBytes(filePath);
        } catch (IOException ex) {
            throw new RuntimeException("Не удалось загрузить файл", ex);
        }
    }
    
    /**
     * Удаляет файл по ссылке
     */
    public void deleteFile(String fileRef) {
        try {
            Path filePath = getStorageLocation().resolve(fileRef).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            throw new RuntimeException("Не удалось удалить файл", ex);
        }
    }
}
