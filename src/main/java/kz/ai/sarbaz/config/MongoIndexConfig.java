package kz.ai.sarbaz.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;

import kz.ai.sarbaz.entity.Chat;
import kz.ai.sarbaz.entity.Message;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = {"kz.ai.sarbaz.entity", "kz.ai.sarbaz.repository"})
public class MongoIndexConfig {

    @Autowired
    private MongoTemplate mongoTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void initIndicesAfterStartup() {
        // Индексы для чатов
        mongoTemplate.indexOps(Chat.class)
                .ensureIndex(new Index()
                        .on("active", Sort.Direction.DESC)
                        .on("updatedAt", Sort.Direction.DESC));
        
        mongoTemplate.indexOps(Chat.class)
                .ensureIndex(new Index()
                        .on("updatedAt", Sort.Direction.DESC));

        // Индексы для сообщений
        mongoTemplate.indexOps(Message.class)
                .ensureIndex(new Index()
                        .on("chatId", Sort.Direction.ASC)
                        .on("timestamp", Sort.Direction.ASC));
        
        mongoTemplate.indexOps(Message.class)
                .ensureIndex(new Index()
                        .on("chatId", Sort.Direction.ASC)
                        .on("sequenceNumber", Sort.Direction.DESC));
    }
}
