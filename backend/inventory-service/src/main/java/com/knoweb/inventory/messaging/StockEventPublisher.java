package com.knoweb.inventory.messaging;

import com.knoweb.inventory.entity.InventoryItem;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class StockEventPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void publishStockLow(InventoryItem item, String tenantId) {
        StockLowEvent event = new StockLowEvent(
                item.getId(),
                item.getName(),
                tenantId,
                item.getCurrentQuantity(),
                item.getBufferLevel(),
                Instant.now().toString()
        );
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.STOCK_LOW_ROUTING_KEY, event);
        System.out.println("📢 [RabbitMQ] STOCK_LOW event published: "
                + item.getName() + " (" + item.getCurrentQuantity() + " remaining) | Tenant: " + tenantId);
    }
}
