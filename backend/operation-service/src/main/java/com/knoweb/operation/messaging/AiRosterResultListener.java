package com.knoweb.operation.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;
import java.util.List;
import java.time.LocalDate;
import com.knoweb.operation.entity.Muster;
import com.knoweb.operation.repository.MusterRepository;

@Service
public class AiRosterResultListener {

    private static final Logger logger = LoggerFactory.getLogger(AiRosterResultListener.class);
    
    private final com.knoweb.operation.repository.MusterRepository musterRepository;

    public AiRosterResultListener(com.knoweb.operation.repository.MusterRepository musterRepository) {
        this.musterRepository = musterRepository;
    }

    @RabbitListener(queues = RabbitMQConfig.AI_ROSTER_REVISED_QUEUE)
    public void receiveAiRosterRevision(@Payload AiRosterRevisedEvent revisedEvent) {
        logger.info("=================================================");
        logger.info("🤖 AI SUPERVISOR RESPONSE RECEIVED:Saving to DB...");
        logger.info("=================================================");
        
        try {
            java.time.LocalDate date = java.time.LocalDate.parse(revisedEvent.getDate());
            java.util.List<com.knoweb.operation.entity.Muster> musters = 
                musterRepository.findByDivisionIdAndDate(revisedEvent.getEstateId(), date);
            
            if (musters.isEmpty()) {
                logger.warn("No musters found to attach AI advisory for {} on {}", 
                    revisedEvent.getEstateId(), revisedEvent.getDate());
                return;
            }

            for (com.knoweb.operation.entity.Muster muster : musters) {
                muster.setAiAdvisory(revisedEvent.getAiNotes());
                musterRepository.save(muster);
            }
            
            logger.info("Successfully attached AI Advisory to {} muster records.", musters.size());
        } catch (Exception e) {
            logger.error("Failed to persist AI advisory: {}", e.getMessage());
        }
    }
}
