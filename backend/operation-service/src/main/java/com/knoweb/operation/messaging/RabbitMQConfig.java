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

    @Bean
    public TopicExchange plantationExchange() {
        return new TopicExchange(EXCHANGE, true, false);
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
