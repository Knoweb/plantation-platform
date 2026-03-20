package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.FertilizerMaster;
import com.knoweb.tenant.repository.FertilizerMasterRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/fertilizer-master")
public class FertilizerMasterController {

    private final FertilizerMasterRepository repo;

    public FertilizerMasterController(FertilizerMasterRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam UUID tenantId) {
        return ResponseEntity.ok(repo.findByTenantId(tenantId));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody FertilizerMaster master) {
        try {
            if (master.getTenantId() == null) throw new IllegalArgumentException("tenantId is required");
            if (master.getName() == null || master.getName().trim().isEmpty()) throw new IllegalArgumentException("name is required");
            if (master.getNitrogenPercent() == null) throw new IllegalArgumentException("nitrogenPercent is required");
            if (master.getNitrogenPercent() < 0 || master.getNitrogenPercent() > 100) throw new IllegalArgumentException("nitrogenPercent must be 0..100");

            repo.findByTenantIdAndNameIgnoreCase(master.getTenantId(), master.getName().trim())
                    .ifPresent(existing -> { throw new IllegalArgumentException("Fertilizer already exists"); });

            master.setName(master.getName().trim());
            return ResponseEntity.ok(repo.save(master));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody FertilizerMaster patch) {
        try {
            FertilizerMaster saved = repo.findById(id).map(existing -> {
                if (patch.getName() != null && !patch.getName().trim().isEmpty()) existing.setName(patch.getName().trim());
                if (patch.getNitrogenPercent() != null) existing.setNitrogenPercent(patch.getNitrogenPercent());
                return repo.save(existing);
            }).orElseThrow(() -> new IllegalArgumentException("Not found"));
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}

