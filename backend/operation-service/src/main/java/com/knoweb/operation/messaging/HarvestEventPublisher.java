package com.knoweb.operation.messaging;

import com.knoweb.operation.entity.HarvestLog;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class HarvestEventPublisher {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void publishHarvestLogged(HarvestLog log) {
        HarvestLoggedEvent event = new HarvestLoggedEvent(
                log.getId(),
                log.getTenantId(),
                log.getDivisionId(),
                log.getWorkerName(),
                log.getFieldName(),
                log.getQuantityKg(),
                log.getCropType(),
                log.getDate() != null ? log.getDate().toString() : null
        );
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.HARVEST_ROUTING_KEY, event);
        System.out.println("📢 [RabbitMQ] HARVEST_LOGGED event published: "
                + log.getQuantityKg() + "kg of " + log.getCropType()
                + " by " + log.getWorkerName()
                + " | Tenant: " + log.getTenantId());
    }
}
