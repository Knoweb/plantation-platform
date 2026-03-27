package com.knoweb.operation.controller;

import com.knoweb.operation.entity.LeaveApplication;
import com.knoweb.operation.entity.LeaveQuota;
import com.knoweb.operation.service.LeaveService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/operations/leaves")
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    // ─── Quota endpoints ─────────────────────────────────────────────────────

    @GetMapping("/users/{userId}/quota")
    public LeaveQuota getQuota(@PathVariable UUID userId) {
        return leaveService.getQuotaForUser(userId);
    }

    @PutMapping("/users/{userId}/quota")
    public LeaveQuota updateQuota(@PathVariable UUID userId, @RequestBody LeaveQuota quota) {
        return leaveService.updateQuota(userId, quota);
    }

    // ─── Taken Days (Previous leaves already approved) ────────────────────────

    @GetMapping("/users/{userId}/taken")
    public Map<String, Integer> getTakenDays(@PathVariable UUID userId) {
        return leaveService.getTakenDaysForUser(userId);
    }

    // ─── Leave Applications ──────────────────────────────────────────────────

    @PostMapping("/applications")
    public ResponseEntity<LeaveApplication> submitApplication(@RequestBody LeaveApplication application) {
        return ResponseEntity.ok(leaveService.submitApplication(application));
    }

    @GetMapping("/users/{userId}/applications")
    public List<LeaveApplication> getUserApplications(@PathVariable UUID userId) {
        return leaveService.getApplicationsForUser(userId);
    }

    @GetMapping("/tenant/{tenantId}/applications")
    public List<LeaveApplication> getTenantApplications(@PathVariable UUID tenantId) {
        return leaveService.getAllApplicationsForTenant(tenantId);
    }

    @PutMapping("/applications/{id}/review")
    public ResponseEntity<LeaveApplication> reviewApplication(
            @PathVariable UUID id,
            @RequestParam String status,
            @RequestParam(required = false) String remarks) {
        return ResponseEntity.ok(leaveService.reviewApplication(id, status, remarks != null ? remarks : ""));
    }
}
