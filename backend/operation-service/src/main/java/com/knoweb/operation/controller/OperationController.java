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
    public List<Muster> getMusters(@RequestParam String tenantId) {
        return service.getMusters(tenantId);
    }

    @PostMapping("/muster")
    public Muster createMuster(@RequestBody Muster muster) {
        return service.createMuster(muster);
    }

    @PutMapping("/muster/{id}/approve")
    public Muster approveMuster(@PathVariable Long id) {
        return service.approveMuster(id);
    }

    // Harvest Endpoints
    @GetMapping("/harvest")
    public List<HarvestLog> getHarvestLogs(@RequestParam String tenantId) {
        return service.getHarvestLogs(tenantId);
    }

    @PostMapping("/harvest")
    public HarvestLog logHarvest(@RequestBody HarvestLog log) {
        return service.logHarvest(log);
    }
}
