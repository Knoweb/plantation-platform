package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.Field;
import com.knoweb.tenant.service.FieldService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/fields")
public class FieldController {

    private final FieldService fieldService;

    public FieldController(FieldService fieldService) {
        this.fieldService = fieldService;
    }

    @PostMapping
    public ResponseEntity<?> createField(@RequestBody Map<String, Object> payload) {
        try {
            UUID tenantId = UUID.fromString((String) payload.get("tenantId"));
            UUID divisionId = UUID.fromString((String) payload.get("divisionId"));
            String name = (String) payload.get("name");
            Double acreage = Double.valueOf(payload.get("acreage").toString());
            String cropType = (String) payload.get("cropType");

            return ResponseEntity.ok(fieldService.createField(tenantId, divisionId, name, acreage, cropType));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getFields(@RequestParam(required = false) UUID divisionId,
            @RequestParam(required = false) String divisionIds,
            @RequestParam(required = false) UUID tenantId) {
        if (divisionIds != null && !divisionIds.isEmpty()) {
            try {
                java.util.List<UUID> ids = java.util.Arrays.stream(divisionIds.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(java.util.UUID::fromString)
                    .collect(java.util.stream.Collectors.toList());
                return ResponseEntity.ok(fieldService.getFieldsByDivisionIds(ids));
            } catch (Exception e) {
                 return ResponseEntity.badRequest().body(Map.of("message", "Invalid UUID list format: " + e.getMessage()));
            }
        } else if (divisionId != null) {
            return ResponseEntity.ok(fieldService.getFieldsByDivision(divisionId));
        } else if (tenantId != null) {
            return ResponseEntity.ok(fieldService.getFieldsByTenant(tenantId));
        }
        return ResponseEntity.badRequest().body(Map.of("message", "Provide divisionId, divisionIds or tenantId"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteField(@PathVariable UUID id) {
        fieldService.deleteField(id);
        return ResponseEntity.noContent().build();
    }
}
