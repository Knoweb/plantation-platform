package com.knoweb.operation.controller;

import com.knoweb.operation.entity.Message;
import com.knoweb.operation.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    @GetMapping
    public ResponseEntity<List<Message>> getMessages(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestParam String userId,
            @RequestParam String userRole) {
        
        List<Message> msgs = messageRepository.findMessagesForUser(tenantId, userId, userRole);
        return ResponseEntity.ok(msgs);
    }

    @PostMapping
    public ResponseEntity<Message> sendMessage(
            @RequestHeader("X-Tenant-ID") String tenantId,
            @RequestBody Message message) {
        
        message.setTenantId(tenantId);
        message.setTimestamp(LocalDateTime.now());
        message.setRead(false);
        Message saved = messageRepository.save(message);
        return ResponseEntity.ok(saved);
    }
    
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id) {
        messageRepository.findById(id).ifPresent(m -> {
            m.setRead(true);
            messageRepository.save(m);
        });
        return ResponseEntity.ok().build();
    }
}
