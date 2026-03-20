package com.knoweb.operation.repository;

import com.knoweb.operation.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    
    // Find all messages involving the user (either explicitly sent to them, by them, or sent to their role)
    @Query("SELECT m FROM Message m WHERE m.tenantId = :tenantId AND (m.senderId = :userId OR m.receiverId = :userId OR m.receiverId = :userRole) ORDER BY m.timestamp ASC")
    List<Message> findMessagesForUser(String tenantId, String userId, String userRole);

    List<Message> findByTenantIdAndReceiverIdAndIsReadFalse(String tenantId, String receiverId);
}
