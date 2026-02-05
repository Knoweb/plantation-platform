package com.knoweb.operation.controller;

import com.knoweb.operation.entity.HarvestLog;
import com.knoweb.operation.entity.Muster;
import com.knoweb.operation.service.OperationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operations")
public class OperationController {

    @Autowired
    private OperationService service;

    // Muster Endpoints
    @GetMapping("/muster")
    public ResponseEntity<?> getMusters(@RequestParam String tenantId,
            @RequestParam(required = false) String divisionId) {
        if (divisionId != null && !divisionId.isEmpty()) {
            return ResponseEntity.ok(service.getMustersByDivision(tenantId, divisionId));
        }
        return ResponseEntity.ok(service.getMusters(tenantId));
    }

    @PostMapping("/muster")
    public Muster createMuster(@RequestBody Muster muster) {
        return service.createMuster(muster);
    }

    @PutMapping("/muster/{id}/approve")
    public Muster approveMuster(@PathVariable Long id) {
        return service.approveMuster(id);
    }

    @PutMapping("/muster/{id}")
    public ResponseEntity<?> updateMuster(@PathVariable Long id, @RequestBody Muster muster) {
        return ResponseEntity.ok(service.updateMuster(id, muster));
    }

    @DeleteMapping("/muster/{id}")
    public ResponseEntity<?> deleteMuster(@PathVariable Long id) {
        service.deleteMuster(id);
        return ResponseEntity.ok().build();
    }

    // Harvest Endpoints
    @GetMapping("/harvest")
    public ResponseEntity<?> getHarvestLogs(@RequestParam String tenantId,
            @RequestParam(required = false) String divisionId) {
        if (divisionId != null && !divisionId.isEmpty()) {
            return ResponseEntity.ok(service.getHarvestLogsByDivision(tenantId, divisionId));
        }
        return ResponseEntity.ok(service.getHarvestLogs(tenantId));
    }

    @PostMapping("/harvest")
    public HarvestLog logHarvest(@RequestBody HarvestLog log) {
        return service.logHarvest(log);
    }
}
