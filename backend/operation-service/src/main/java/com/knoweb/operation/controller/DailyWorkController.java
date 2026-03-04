package com.knoweb.operation.controller;

import com.knoweb.operation.dto.DailyWorkRequest;
import com.knoweb.operation.service.DailyWorkService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.Map;
import com.knoweb.operation.dto.ReviewRequest;

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
            @RequestParam(required = false) String status) {

        if (divisionId != null) {
            return ResponseEntity.ok(dailyWorkService.getRecordsByDivision(tenantId, divisionId));
        }
        if ("PENDING".equalsIgnoreCase(status)) {
            return ResponseEntity.ok(dailyWorkService.getPendingRecords(tenantId));
        }
        return ResponseEntity.ok(dailyWorkService.getRecordsByTenant(tenantId));
    }
}
