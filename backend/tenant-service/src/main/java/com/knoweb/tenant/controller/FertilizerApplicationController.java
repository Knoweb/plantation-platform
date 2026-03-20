package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.FertilizerApplication;
import com.knoweb.tenant.repository.FertilizerApplicationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/fertilizer-applications")
public class FertilizerApplicationController {

    private final FertilizerApplicationRepository repo;

    public FertilizerApplicationController(FertilizerApplicationRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam UUID tenantId,
            @RequestParam UUID divisionId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        if (year != null && month != null) {
            return ResponseEntity.ok(repo.findByTenantIdAndDivisionIdAndYearAndMonth(tenantId, divisionId, year, month));
        }
        if (year != null) {
            return ResponseEntity.ok(repo.findByTenantIdAndDivisionIdAndYear(tenantId, divisionId, year));
        }
        return ResponseEntity.ok(repo.findByTenantIdAndDivisionId(tenantId, divisionId));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody FertilizerApplication app) {
        try {
            validate(app);
            return ResponseEntity.ok(repo.save(app));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody FertilizerApplication patch) {
        try {
            FertilizerApplication saved = repo.findById(id).map(existing -> {
                if (patch.getFieldId() != null) existing.setFieldId(patch.getFieldId());
                if (patch.getYear() != null) existing.setYear(patch.getYear());
                if (patch.getMonth() != null) existing.setMonth(patch.getMonth());
                if (patch.getFertilizerId() != null) existing.setFertilizerId(patch.getFertilizerId());
                if (patch.getQtyKg() != null) existing.setQtyKg(patch.getQtyKg());
                return repo.save(existing);
            }).orElseThrow(() -> new IllegalArgumentException("Not found"));
            validate(saved);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping
    public ResponseEntity<?> bulkUpsert(@RequestBody List<FertilizerApplication> apps) {
        try {
            for (FertilizerApplication app : apps) validate(app);
            return ResponseEntity.ok(repo.saveAll(apps));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private void validate(FertilizerApplication app) {
        if (app.getTenantId() == null) throw new IllegalArgumentException("tenantId is required");
        if (app.getDivisionId() == null) throw new IllegalArgumentException("divisionId is required");
        if (app.getFieldId() == null) throw new IllegalArgumentException("fieldId is required");
        if (app.getYear() == null) throw new IllegalArgumentException("year is required");
        if (app.getMonth() == null) throw new IllegalArgumentException("month is required");
        if (app.getMonth() < 1 || app.getMonth() > 12) throw new IllegalArgumentException("month must be 1..12");
        if (app.getFertilizerId() == null) throw new IllegalArgumentException("fertilizerId is required");
        if (app.getQtyKg() == null) throw new IllegalArgumentException("qtyKg is required");
        if (app.getQtyKg() < 0) throw new IllegalArgumentException("qtyKg must be >= 0");
    }
}

