package kz.ai.sarbaz.repository;

import kz.ai.sarbaz.entity.Chat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRepository extends MongoRepository<Chat, String> {
    List<Chat> findByActiveTrue();
    Page<Chat> findByActiveTrueOrderByUpdatedAtDesc(Pageable pageable);
    Page<Chat> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}
