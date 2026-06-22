package com.knoweb.operation.service;

import com.knoweb.operation.entity.HarvestLog;
import com.knoweb.operation.entity.Muster;
import com.knoweb.operation.messaging.HarvestEventPublisher;
import com.knoweb.operation.repository.HarvestLogRepository;
import com.knoweb.operation.repository.MusterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class OperationService {

    @Autowired
    private MusterRepository musterRepository;

    @Autowired
    private HarvestLogRepository harvestLogRepository;

    @Autowired
    private HarvestEventPublisher harvestEventPublisher;

    // Muster Operations
    public List<Muster> getMusters(String tenantId) {
        return musterRepository.findByTenantIdOrderByDateDesc(tenantId);
    }

    public List<Muster> getMustersByDivision(String tenantId, String divisionId) {
        return musterRepository.findByTenantIdAndDivisionIdOrderByDateDesc(tenantId, divisionId);
    }

    public Muster createMuster(Muster muster) {
        if (muster.getDate() == null)
            muster.setDate(LocalDate.now());
        if (muster.getStatus() == null)
            muster.setStatus("PENDING");

        // Auto-calculate worker count based on assigned list
        if (muster.getWorkerIds() != null) {
            muster.setWorkerCount(muster.getWorkerIds().size());
        }

        return musterRepository.save(muster);
    }

    public Muster approveMuster(Long id) {
        Muster muster = musterRepository.findById(id).orElseThrow(() -> new RuntimeException("Muster not found"));
        muster.setStatus("APPROVED");
        return musterRepository.save(muster);
    }

    public Muster updateMuster(Long id, Muster updatedMuster) {
        Muster existing = musterRepository.findById(id).orElseThrow(() -> new RuntimeException("Muster not found"));
        existing.setFieldName(updatedMuster.getFieldName());
        existing.setTaskType(updatedMuster.getTaskType());
        existing.setDivisionId(updatedMuster.getDivisionId());
        
        if (updatedMuster.getWorkerIds() != null) {
            existing.setWorkerIds(updatedMuster.getWorkerIds());
            existing.setWorkerCount(updatedMuster.getWorkerIds().size());
        }
        
        return musterRepository.save(existing);
    }

    public void deleteMuster(Long id) {
        musterRepository.deleteById(id);
    }

    // Harvest Operations
    public List<HarvestLog> getHarvestLogs(String tenantId) {
        return harvestLogRepository.findByTenantIdOrderByDateDesc(tenantId);
    }

    public List<HarvestLog> getHarvestLogsByDivision(String tenantId, String divisionId) {
        return harvestLogRepository.findByTenantIdAndDivisionIdOrderByDateDesc(tenantId, divisionId);
    }

    public HarvestLog logHarvest(HarvestLog log) {
        if (log.getDate() == null)
            log.setDate(LocalDate.now());
        HarvestLog saved = harvestLogRepository.save(log);
        // 📢 Publish HARVEST_LOGGED event to RabbitMQ
        try {
            harvestEventPublisher.publishHarvestLogged(saved);
        } catch (Exception e) {
            // Fail silently — event publishing never breaks the main operation
            System.err.println("[RabbitMQ] Failed to publish HARVEST_LOGGED event: " + e.getMessage());
        }
        return saved;
    }
}
