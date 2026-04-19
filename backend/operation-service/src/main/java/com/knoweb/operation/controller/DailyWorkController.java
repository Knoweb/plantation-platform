package com.knoweb.operation.controller;

import com.knoweb.operation.dto.DailyWorkRequest;
import com.knoweb.operation.service.DailyWorkService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.Map;
import com.knoweb.operation.dto.ReviewRequest;
import com.knoweb.operation.entity.DailyWork;
import java.util.List;

@RestController
@RequestMapping("/api/operations/daily-work")
public class DailyWorkController {

    private final DailyWorkService dailyWorkService;

    public DailyWorkController(DailyWorkService dailyWorkService) {
        this.dailyWorkService = dailyWorkService;
    }

    @PostMapping
    public ResponseEntity<?> submitWork(@RequestBody DailyWorkRequest request) {
        try {
            return ResponseEntity.ok(dailyWorkService.submitWork(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveWork(@PathVariable UUID id, @RequestBody(required = false) ReviewRequest request) {
        try {
            return ResponseEntity.ok(dailyWorkService.approveWork(id, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectWork(@PathVariable UUID id, @RequestBody(required = false) ReviewRequest request) {
        try {
            return ResponseEntity.ok(dailyWorkService.rejectWork(id, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/weights")
    public ResponseEntity<?> updateBulkWeights(@PathVariable UUID id, @RequestBody Map<String, Object> payload) {
        try {
            String weights = (String) payload.get("bulkWeights");
            boolean isSubmission = payload.get("isSubmission") != null && (boolean) payload.get("isSubmission");
            return ResponseEntity.ok(dailyWorkService.updateBulkWeights(id, weights, isSubmission));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/audit-remarks")
    public ResponseEntity<?> updateAuditRemarks(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        try {
            String remarks = payload.get("auditRemarks");
            return ResponseEntity.ok(dailyWorkService.updateAuditRemarks(id, remarks));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteWork(@PathVariable UUID id) {
        try {
            dailyWorkService.deleteWork(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getRecords(
            @RequestParam UUID tenantId,
            @RequestParam(required = false) String divisionId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String date) {

        if (divisionId != null) {
            return ResponseEntity.ok(dailyWorkService.getRecordsByDivision(tenantId, divisionId));
        }
        if (date != null) {
            java.time.LocalDate workDate = java.time.LocalDate.parse(date);
            return ResponseEntity.ok(dailyWorkService.getRecordsByTenantAndDate(tenantId, workDate));
        }
        if ("PENDING".equalsIgnoreCase(status)) {
            return ResponseEntity.ok(dailyWorkService.getPendingRecords(tenantId));
        }
        return ResponseEntity.ok(dailyWorkService.getRecordsByTenant(tenantId));
    }
    @GetMapping("/check")
    public ResponseEntity<?> checkWorkSubmission(
            @RequestParam UUID tenantId,
            @RequestParam String divisionId,
            @RequestParam String date) {
        try {
            java.time.LocalDate workDate = java.time.LocalDate.parse(date);
            return ResponseEntity.ok(dailyWorkService.checkWorkSubmission(tenantId, divisionId, workDate));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/audited")
    public List<DailyWork> getAuditedRecords(@RequestParam UUID tenantId) {
        return dailyWorkService.getRecordsByTenant(tenantId).stream()
                .filter(dw -> dw.getAuditRemarks() != null && !dw.getAuditRemarks().isEmpty())
                .toList();
    }
}
