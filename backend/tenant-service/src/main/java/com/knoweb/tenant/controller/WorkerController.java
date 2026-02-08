package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.Worker;
import com.knoweb.tenant.service.WorkerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workers")
public class WorkerController {

    @Autowired
    private WorkerService workerService;

    @PostMapping
    public ResponseEntity<Worker> createWorker(@RequestBody Worker worker) {
        return ResponseEntity.ok(workerService.createWorker(worker));
    }

    @GetMapping
    public ResponseEntity<List<Worker>> getWorkers(
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) String divisionId) {

        if (divisionId != null && !divisionId.isEmpty()) {
            return ResponseEntity.ok(workerService.getWorkersByDivision(divisionId));
        }
        if (tenantId != null && !tenantId.isEmpty()) {
            return ResponseEntity.ok(workerService.getAllWorkers(tenantId));
        }
        return ResponseEntity.badRequest().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Worker> updateWorker(@PathVariable UUID id, @RequestBody Worker worker) {
        return ResponseEntity.ok(workerService.updateWorker(id, worker));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorker(@PathVariable UUID id) {
        workerService.deleteWorker(id);
        return ResponseEntity.ok().build();
    }
}
