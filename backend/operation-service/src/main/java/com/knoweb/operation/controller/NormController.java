package com.knoweb.operation.controller;

import com.knoweb.operation.entity.Norm;
import com.knoweb.operation.service.NormService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/operations/norms")
public class NormController {

    @Autowired
    private NormService normService;

    @GetMapping
    public ResponseEntity<List<Norm>> getAllNorms(
            @RequestHeader("X-Tenant-Id") String tenantId) {
        return ResponseEntity.ok(normService.getAllNorms(tenantId));
    }

    @GetMapping("/active")
    public ResponseEntity<Norm> getActiveNorm(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @RequestParam String jobRole,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        if (date == null) {
            date = LocalDate.now();
        }
        Norm norm = normService.getActiveNorm(tenantId, jobRole, date);
        if (norm != null) {
            return ResponseEntity.ok(norm);
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<Norm> createNorm(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @RequestBody Norm norm) {
        return ResponseEntity.ok(normService.createNorm(tenantId, norm));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Norm> updateNorm(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id,
            @RequestBody Norm norm) {
        Norm updated = normService.updateNorm(id, norm);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNorm(
            @RequestHeader("X-Tenant-Id") String tenantId,
            @PathVariable UUID id) {
        normService.deleteNorm(id);
        return ResponseEntity.ok().build();
    }
}
