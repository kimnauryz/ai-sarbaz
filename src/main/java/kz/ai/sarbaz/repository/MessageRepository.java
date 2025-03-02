package kz.ai.sarbaz.repository;

import kz.ai.sarbaz.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {
    Page<Message> findByChatIdOrderByTimestampAsc(String chatId, Pageable pageable);
    List<Message> findByChatIdOrderBySequenceNumberDesc(String chatId, Pageable pageable);
    long countByChatId(String chatId);
}
