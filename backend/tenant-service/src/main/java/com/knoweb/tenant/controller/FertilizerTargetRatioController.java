package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.FertilizerTargetRatio;
import com.knoweb.tenant.repository.FertilizerTargetRatioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/fertilizer-target-ratio")
public class FertilizerTargetRatioController {

    private final FertilizerTargetRatioRepository repo;

    public FertilizerTargetRatioController(FertilizerTargetRatioRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam UUID tenantId,
            @RequestParam UUID divisionId,
            @RequestParam String cropType,
            @RequestParam String planMonth
    ) {
        return ResponseEntity.ok(repo.findByTenantIdAndDivisionIdAndCropTypeAndPlanMonth(tenantId, divisionId, cropType.toUpperCase(), planMonth));
    }

    @PutMapping
    public ResponseEntity<?> upsert(@RequestBody List<FertilizerTargetRatio> rows) {
        try {
            for (FertilizerTargetRatio r : rows) validate(r);
            // Save one-by-one to respect unique constraint via find+update
            for (FertilizerTargetRatio r : rows) {
                String cropType = r.getCropType().toUpperCase();
                FertilizerTargetRatio saved = repo
                        .findByTenantIdAndDivisionIdAndCropTypeAndFieldIdAndPlanMonth(
                                r.getTenantId(),
                                r.getDivisionId(),
                                cropType,
                                r.getFieldId(),
                                r.getPlanMonth()
                        )
                        .map(existing -> {
                            existing.setTargetRatioPercent(r.getTargetRatioPercent());
                            if (r.getCrop12m() != null) {
                                existing.setCrop12m(r.getCrop12m());
                            }
                            return repo.save(existing);
                        })
                        .orElseGet(() -> {
                            r.setCropType(cropType);
                            return repo.save(r);
                        });
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private void validate(FertilizerTargetRatio r) {
        if (r.getTenantId() == null) throw new IllegalArgumentException("tenantId is required");
        if (r.getDivisionId() == null) throw new IllegalArgumentException("divisionId is required");
        if (r.getCropType() == null || r.getCropType().isBlank()) throw new IllegalArgumentException("cropType is required");
        if (r.getFieldId() == null) throw new IllegalArgumentException("fieldId is required");
        if (r.getPlanMonth() == null || r.getPlanMonth().isBlank()) throw new IllegalArgumentException("planMonth is required");
        if (r.getTargetRatioPercent() == null) throw new IllegalArgumentException("targetRatioPercent is required");
        if (r.getTargetRatioPercent() < 0 || r.getTargetRatioPercent() > 100) throw new IllegalArgumentException("targetRatioPercent must be 0..100");
    }
}

