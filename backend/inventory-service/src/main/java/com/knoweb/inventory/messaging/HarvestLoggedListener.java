package com.knoweb.inventory.messaging;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class HarvestLoggedListener {

    @RabbitListener(queues = RabbitMQConfig.HARVEST_QUEUE)
    public void onHarvestLogged(HarvestLoggedEvent event) {
        System.out.println("📥 [RabbitMQ] HARVEST_LOGGED received by InventoryService:");
        System.out.println("   Worker: " + event.getWorkerName()
                + " | Field: " + event.getFieldName()
                + " | Quantity: " + event.getQuantityKg() + "kg"
                + " | Crop: " + event.getCropType()
                + " | Division: " + event.getDivisionId()
                + " | Tenant: " + event.getTenantId());
        // Future: auto-receipt harvested crop into inventory, trigger factory notification, etc.
    }
}
