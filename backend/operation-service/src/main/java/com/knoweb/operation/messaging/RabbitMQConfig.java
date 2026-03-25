package com.knoweb.operation.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Same shared exchange as inventory-service
    public static final String EXCHANGE = "plantation.topic";

    // HARVEST events (operation-service publishes)
    public static final String HARVEST_ROUTING_KEY = "harvest.logged";

    // AI events
    public static final String AI_ROSTER_CHECK_ROUTING_KEY = "ai.roster.check";
    
    // AI Listener configurations
    public static final String AI_ROSTER_REVISED_QUEUE = "ai.roster.queue.revised";
    public static final String AI_ROSTER_REVISED_ROUTING_KEY = "ai.roster.revised";

    @Bean
    public TopicExchange plantationExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    public Queue aiRosterRevisedQueue() {
        return new Queue(AI_ROSTER_REVISED_QUEUE, true);
    }

    @Bean
    public Binding aiRosterRevisedBinding(Queue aiRosterRevisedQueue, TopicExchange plantationExchange) {
        return BindingBuilder.bind(aiRosterRevisedQueue).to(plantationExchange).with(AI_ROSTER_REVISED_ROUTING_KEY);
    }

    // Use JSON for cross-service message serialization
    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }
}
