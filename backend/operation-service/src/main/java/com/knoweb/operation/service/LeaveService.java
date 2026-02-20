package com.knoweb.operation.service;

import com.knoweb.operation.entity.LeaveQuota;
import com.knoweb.operation.repository.LeaveQuotaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class LeaveService {

    private final LeaveQuotaRepository leaveQuotaRepository;

    public LeaveService(LeaveQuotaRepository leaveQuotaRepository) {
        this.leaveQuotaRepository = leaveQuotaRepository;
    }

    public LeaveQuota getQuotaForUser(UUID userId) {
        return leaveQuotaRepository.findByUserId(userId)
                .orElseGet(() -> {
                    // Default values if no quota exists yet - "virtual" object
                    LeaveQuota q = new LeaveQuota();
                    q.setUserId(userId);
                    q.setDutyLeave(5); 
                    q.setAnnualLeave(14); 
                    q.setCasualLeave(7); 
                    return q;
                });
    }

    @Transactional
    public LeaveQuota updateQuota(UUID userId, LeaveQuota updatedQuota) {
        LeaveQuota existing = leaveQuotaRepository.findByUserId(userId).orElse(new LeaveQuota());
        
        if (existing.getId() == null) {
            existing.setUserId(userId);
            existing.setTenantId(updatedQuota.getTenantId());
        }

        existing.setDutyLeave(updatedQuota.getDutyLeave());
        existing.setAnnualLeave(updatedQuota.getAnnualLeave());
        existing.setCasualLeave(updatedQuota.getCasualLeave());

        return leaveQuotaRepository.save(existing);
    }
}
