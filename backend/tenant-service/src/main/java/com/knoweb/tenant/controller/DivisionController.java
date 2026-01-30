package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.Division;
import com.knoweb.tenant.service.DivisionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/divisions")
public class DivisionController {

    private final DivisionService divisionService;

    public DivisionController(DivisionService divisionService) {
        this.divisionService = divisionService;
    }

    @PostMapping
    public ResponseEntity<?> createDivision(@RequestBody Map<String, Object> payload) {
        try {
            UUID tenantId = UUID.fromString((String) payload.get("tenantId"));
            String name = (String) payload.get("name");
            return ResponseEntity.ok(divisionService.createDivision(tenantId, name));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getDivisions(@RequestParam UUID tenantId) {
        return ResponseEntity.ok(divisionService.getDivisionsByTenant(tenantId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDivision(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        try {
            return ResponseEntity.ok(divisionService.updateDivision(id, payload.get("name")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDivision(@PathVariable UUID id) {
        try {
            divisionService.deleteDivision(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot delete division"));
        }
    }
}
