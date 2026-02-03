package com.knoweb.operation.service;

import com.knoweb.operation.entity.HarvestLog;
import com.knoweb.operation.entity.Muster;
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

    // Muster Operations
    public List<Muster> getMusters(String tenantId) {
        return musterRepository.findByTenantIdOrderByDateDesc(tenantId);
    }

    public Muster createMuster(Muster muster) {
        if (muster.getDate() == null)
            muster.setDate(LocalDate.now());
        if (muster.getStatus() == null)
            muster.setStatus("PENDING");
        return musterRepository.save(muster);
    }

    public Muster approveMuster(Long id) {
        Muster muster = musterRepository.findById(id).orElseThrow(() -> new RuntimeException("Muster not found"));
        muster.setStatus("APPROVED");
        return musterRepository.save(muster);
    }

    // Harvest Operations
    public List<HarvestLog> getHarvestLogs(String tenantId) {
        return harvestLogRepository.findByTenantIdOrderByDateDesc(tenantId);
    }

    public HarvestLog logHarvest(HarvestLog log) {
        if (log.getDate() == null)
            log.setDate(LocalDate.now());
        return harvestLogRepository.save(log);
    }
}
