# Spring AI Chat

Интеллектуальная чат-система на основе Spring AI с поддержкой множественных LLM моделей через Ollama и MistralAI.

## Обзор проекта

Spring AI Chat - это приложение для чата с использованием больших языковых моделей (LLM), которое предоставляет:

- Современный веб-интерфейс на Vue.js
- Поддержку моделей Ollama (llama3.2:3b, llama3.2:8b и др.)
- Поддержку моделей MistralAI (через API)
- Сохранение истории чатов в MongoDB
- Загрузку и отправку файлов-вложений
- Управление контекстом разговора для более связных ответов
- Экспорт данных для анализа и обучения моделей

## Ключевые компоненты

### Бэкенд

- **Spring Boot**: основа приложения
- **Spring AI**: интеграция с LLM моделями
- **MongoDB**: хранение истории чатов и сообщений
- **Spring Data MongoDB**: взаимодействие с базой данных
- **Spring MVC**: REST API для фронтенда

### Фронтенд

- **Vue.js**: реактивный интерфейс пользователя
- **Bootstrap 5**: стилизация и компоненты интерфейса
- **axios**: HTTP-клиент для взаимодействия с API

### Интеграции

- **Ollama**: локальное запуск LLM моделей
- **MistralAI**: облачный LLM сервис
- **Docker**: контейнеризация для простого развертывания

## Функциональность

### Управление чатами

- Создание новых чатов
- Переименование существующих чатов
- Архивация чатов
- Удаление чатов
- Поиск по чатам

### Обработка сообщений

- Отправка текстовых сообщений
- Прикрепление файлов к сообщениям
- Пагинация для длинных чатов
- Сохранение контекста при переключении между чатами
- Поддержка различных моделей с разными параметрами

### Хранение данных

- Постоянное хранение истории чатов в MongoDB
- Оптимизированные индексы для быстрого доступа
- Структурированное хранение метаданных (даты создания, модели и т.д.)
- Хранение вложений на файловой системе

### Экспорт и анализ

- Экспорт истории чатов в JSON и CSV форматы
- Подготовка данных для fine-tuning моделей
- Экспорт по отдельным чатам или всей истории

## Структура проекта

```
src/
├── main/
│   ├── java/
│   │   └── kz/
│   │       └── ai/
│   │           └── sarbaz/
│   │               ├── api/
│   │               │   ├── ChatController.java
│   │               │   └── DataExportController.java
│   │               ├── api/
│   │               │   └── dto/
│   │               │       ├── ChatDTO.java
│   │               │       ├── MessageDTO.java
│   │               │       └── PageResponse.java
│   │               ├── api/
│   │               │   └── model/
│   │               │       ├── ChatRequest.java
│   │               │       └── ChatResponse.java
│   │               ├── config/
│   │               │   ├── MongoIndexConfig.java
│   │               │   ├── OllamaConfig.java
│   │               │   └── WebMvcConfig.java
│   │               ├── entity/
│   │               │   ├── Chat.java
│   │               │   └── Message.java
│   │               ├── repository/
│   │               │   ├── ChatRepository.java
│   │               │   └── MessageRepository.java
│   │               ├── service/
│   │               │   ├── ChatService.java
│   │               │   ├── DataExportService.java
│   │               │   └── FileStorageService.java
│   │               └── Application.java
│   └── resources/
│       ├── static/
│       │   └── vue-chat.html
│       ├── application.properties
│       └── application.yml
├── Dockerfile
├── docker-compose.yml
└── pom.xml
```

## API Endpoints

### Чаты
- `GET /chat/chats` - Получить список чатов с пагинацией
- `POST /chat/chats` - Создать новый чат
- `PUT /chat/chats/{chatId}/title` - Обновить название чата
- `PUT /chat/chats/{chatId}/archive` - Архивировать чат
- `DELETE /chat/chats/{chatId}` - Удалить чат

### Сообщения
- `POST /chat/prompt` - Отправить сообщение и получить ответ
- `GET /chat/history/{chatId}` - Получить историю сообщений в чате

### Экспорт данных
- `GET /api/export/chats/json` - Экспорт всех чатов в JSON
- `GET /api/export/messages/json` - Экспорт всех сообщений в JSON
- `GET /api/export/messages/csv` - Экспорт всех сообщений в CSV
- `GET /api/export/chat/{chatId}` - Экспорт конкретного чата
- `GET /api/export/finetuning` - Экспорт данных для fine-tuning моделей

## Предварительные требования

- Java 17+
- MongoDB
- Ollama и/или доступ к MistralAI API
- Docker и Docker Compose (опционально)

## Запуск приложения

### Локальный запуск

1. Клонируйте репозиторий
2. Настройте MongoDB (локально или через Docker)
3. Установите Ollama и загрузите нужные модели (llama3.2:3b и т.д.)
4. Настройте application.properties:
   ```properties
   spring.data.mongodb.host=localhost
   spring.data.mongodb.port=27017
   spring.data.mongodb.database=chatdb
   spring.ai.ollama.base-url=http://localhost:11434
   ```
5. Запустите приложение:
   ```bash
   ./mvnw spring-boot:run
   ```

### Docker

1. Соберите образ:
   ```bash
   docker-compose build
   ```
2. Запустите контейнеры:
   ```bash
   docker-compose up -d
   ```
3. Загрузите модели в Ollama:
   ```bash
   docker exec -it ollama ollama pull llama3.2:3b
   ```

## Использование

1. Откройте браузер и перейдите по адресу http://localhost:8080/app
2. Создайте новый чат с помощью кнопки "Новый чат"
3. Выберите модель из выпадающего списка
4. Введите сообщение и получите ответ от выбранной модели
5. Прикрепляйте файлы, управляйте чатами и экспортируйте данные по необходимости

## Планируемые улучшения

- [x] Интеграция с MistralAI
- [x] Экспорт данных для анализа
- [x] Современный Vue.js интерфейс
- [ ] Интеграция Spring AI Advisor API
- [ ] Улучшенное управление контекстом и памятью
- [ ] Система ролей и пользователей
- [ ] Поддержка векторных баз данных для RAG
- [ ] Интеграция с Google Gemini и другими LLM

## Лицензия

MIT
