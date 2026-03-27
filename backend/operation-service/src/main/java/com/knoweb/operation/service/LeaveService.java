package com.knoweb.operation.service;

import com.knoweb.operation.entity.LeaveApplication;
import com.knoweb.operation.entity.LeaveQuota;
import com.knoweb.operation.repository.LeaveApplicationRepository;
import com.knoweb.operation.repository.LeaveQuotaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class LeaveService {

    private final LeaveQuotaRepository leaveQuotaRepository;
    private final LeaveApplicationRepository leaveApplicationRepository;

    public LeaveService(LeaveQuotaRepository leaveQuotaRepository,
                        LeaveApplicationRepository leaveApplicationRepository) {
        this.leaveQuotaRepository = leaveQuotaRepository;
        this.leaveApplicationRepository = leaveApplicationRepository;
    }

    // ─── Quota ───────────────────────────────────────────────────────────────

    public LeaveQuota getQuotaForUser(UUID userId) {
        return leaveQuotaRepository.findByUserId(userId)
                .orElseGet(() -> {
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

    // ─── Leave Applications ───────────────────────────────────────────────────

    @Transactional
    public LeaveApplication submitApplication(LeaveApplication application) {
        application.setStatus("PENDING");
        application.setSubmittedAt(LocalDateTime.now());
        return leaveApplicationRepository.save(application);
    }

    public List<LeaveApplication> getApplicationsForUser(UUID userId) {
        return leaveApplicationRepository.findByUserId(userId);
    }

    public List<LeaveApplication> getAllApplicationsForTenant(UUID tenantId) {
        return leaveApplicationRepository.findByTenantId(tenantId);
    }

    @Transactional
    public LeaveApplication reviewApplication(UUID applicationId, String status, String managerRemarks) {
        LeaveApplication app = leaveApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Leave application not found: " + applicationId));
        app.setStatus(status);
        app.setManagerRemarks(managerRemarks);
        app.setReviewedAt(LocalDateTime.now());
        return leaveApplicationRepository.save(app);
    }

    // ─── Taken Days Summary (for "Previous" row in balance sheet) ────────────

    public Map<String, Integer> getTakenDaysForUser(UUID userId) {
        Map<String, Integer> taken = new HashMap<>();
        taken.put("dutyLeave",   leaveApplicationRepository.sumApprovedDaysByType(userId, "Duty"));
        taken.put("annualLeave", leaveApplicationRepository.sumApprovedDaysByType(userId, "Annual"));
        taken.put("casualLeave", leaveApplicationRepository.sumApprovedDaysByType(userId, "Casual"));
        return taken;
    }
}
