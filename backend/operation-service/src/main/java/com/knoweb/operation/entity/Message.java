package com.knoweb.operation.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private UUID id;

    @Column(nullable = false)
    private String tenantId;

    @Column(nullable = false)
    private String senderId;

    @Column(nullable = false)
    private String senderName;
    
    @Column(nullable = false)
    private String senderRole; // MANAGER, FIELD_OFFICER, STORE_KEEPER

    @Column(nullable = false)
    private String receiverId; // Can be a specific userId or a role name for broadcast

    @Column(nullable = false)
    private String receiverName;

    @Column(nullable = false, length = 1000)
    private String content;

    @Column(columnDefinition = "TEXT")
    private String imageAttachment;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();
    
    private boolean isRead = false;

    public Message() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    public String getSenderRole() { return senderRole; }
    public void setSenderRole(String senderRole) { this.senderRole = senderRole; }
    public String getReceiverId() { return receiverId; }
    public void setReceiverId(String receiverId) { this.receiverId = receiverId; }
    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public String getImageAttachment() { return imageAttachment; }
    public void setImageAttachment(String imageAttachment) { this.imageAttachment = imageAttachment; }
}
