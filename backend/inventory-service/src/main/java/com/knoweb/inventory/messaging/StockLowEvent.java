package com.knoweb.inventory.messaging;

import java.io.Serializable;

public class StockLowEvent implements Serializable {

    private Long itemId;
    private String itemName;
    private String tenantId;
    private int currentQuantity;
    private int bufferLevel;
    private String triggeredAt; // ISO string to avoid LocalDateTime serialization issues

    public StockLowEvent() {}

    public StockLowEvent(Long itemId, String itemName, String tenantId,
                         int currentQuantity, int bufferLevel, String triggeredAt) {
        this.itemId = itemId;
        this.itemName = itemName;
        this.tenantId = tenantId;
        this.currentQuantity = currentQuantity;
        this.bufferLevel = bufferLevel;
        this.triggeredAt = triggeredAt;
    }

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public int getCurrentQuantity() { return currentQuantity; }
    public void setCurrentQuantity(int currentQuantity) { this.currentQuantity = currentQuantity; }

    public int getBufferLevel() { return bufferLevel; }
    public void setBufferLevel(int bufferLevel) { this.bufferLevel = bufferLevel; }

    public String getTriggeredAt() { return triggeredAt; }
    public void setTriggeredAt(String triggeredAt) { this.triggeredAt = triggeredAt; }
}
