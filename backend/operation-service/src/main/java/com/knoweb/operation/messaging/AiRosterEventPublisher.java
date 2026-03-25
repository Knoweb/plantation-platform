package com.knoweb.operation.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AiRosterEventPublisher {

    private static final Logger logger = LoggerFactory.getLogger(AiRosterEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Autowired
    public AiRosterEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    /**
     * Publishes a simulated event to trigger the Python AI Microservice 
     * to check the roster and weather conditions.
     */
    public void publishRosterCheckEvent(String tenantId, String estateId, String date) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("tenantId", tenantId);
        payload.put("estateId", estateId);
        payload.put("date", date);
        payload.put("action", "CHECK_ROSTER_AGAINST_WEATHER");

        logger.info("Publishing AI Roster Check event for tenant: {}, estate: {}, date: {}", tenantId, estateId, date);
        
        // Publish to the shared topic exchange with the AI routing key
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.AI_ROSTER_CHECK_ROUTING_KEY, payload);
    }
}
