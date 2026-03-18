package com.knoweb.inventory.messaging;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Shared topic exchange for all plantation events
    public static final String EXCHANGE = "plantation.topic";

    // HARVEST events (inventory listens)
    public static final String HARVEST_QUEUE = "inventory.harvest.queue";
    public static final String HARVEST_ROUTING_KEY = "harvest.logged";

    // STOCK_LOW events (published by inventory, consumed by future notification service)
    public static final String STOCK_LOW_ROUTING_KEY = "inventory.stock.low";

    @Bean
    public TopicExchange plantationExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    public Queue harvestQueue() {
        return QueueBuilder.durable(HARVEST_QUEUE).build();
    }

    @Bean
    public Binding harvestBinding(Queue harvestQueue, TopicExchange plantationExchange) {
        return BindingBuilder.bind(harvestQueue).to(plantationExchange).with(HARVEST_ROUTING_KEY);
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
