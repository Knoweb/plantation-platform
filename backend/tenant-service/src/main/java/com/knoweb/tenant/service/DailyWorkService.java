package com.knoweb.tenant.service;

import com.knoweb.tenant.dto.DailyWorkRequest;
import com.knoweb.tenant.entity.DailyWork;
import com.knoweb.tenant.repository.DailyWorkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class DailyWorkService {

    private final DailyWorkRepository dailyWorkRepository;

    public DailyWorkService(DailyWorkRepository dailyWorkRepository) {
        this.dailyWorkRepository = dailyWorkRepository;
    }

    @Transactional
    public DailyWork submitWork(DailyWorkRequest request) {
        DailyWork work = new DailyWork();
        work.setTenantId(request.getTenantId());
        work.setDivisionId(request.getDivisionId());
        work.setWorkDate(request.getWorkDate());
        work.setWorkType(request.getWorkType());
        work.setDetails(request.getDetails());
        work.setQuantity(request.getQuantity());
        work.setWorkerCount(request.getWorkerCount());
        work.setStatus("PENDING");
        return dailyWorkRepository.save(work);
    }

    @Transactional
    public DailyWork approveWork(UUID workId) {
        DailyWork work = dailyWorkRepository.findById(workId)
                .orElseThrow(() -> new RuntimeException("Work record not found"));
        work.setStatus("APPROVED");
        return dailyWorkRepository.save(work);
    }

    public List<DailyWork> getRecordsByTenant(UUID tenantId) {
        return dailyWorkRepository.findByTenantId(tenantId);
    }

    public List<DailyWork> getPendingRecords(UUID tenantId) {
        return dailyWorkRepository.findByTenantIdAndStatus(tenantId, "PENDING");
    }

    public List<DailyWork> getRecordsByDivision(UUID tenantId, String divisionId) {
        return dailyWorkRepository.findByTenantIdAndDivisionId(tenantId, divisionId);
    }
}
