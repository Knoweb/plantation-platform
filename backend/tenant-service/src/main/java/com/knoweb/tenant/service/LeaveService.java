package com.knoweb.tenant.service;

import com.knoweb.tenant.entity.LeaveQuota;
import com.knoweb.tenant.repository.LeaveQuotaRepository;
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
                    // Return default quota if none exists (virtual object, not saved yet)
                    LeaveQuota quota = new LeaveQuota();
                    quota.setUserId(userId);
                    quota.setDutyLeave(5); // Default
                    quota.setAnnualLeave(14); // Default
                    quota.setCasualLeave(7); // Default
                    return quota;
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
