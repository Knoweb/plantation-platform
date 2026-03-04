package com.knoweb.operation.controller;

import com.knoweb.operation.entity.TaskType;
import com.knoweb.operation.service.TaskTypeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/operations/task-types")
public class TaskTypeController {

    private final TaskTypeService service;

    public TaskTypeController(TaskTypeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<TaskType>> getTaskTypes(@RequestParam UUID tenantId) {
        return ResponseEntity.ok(service.getTaskTypes(tenantId));
    }

    @PostMapping
    public ResponseEntity<TaskType> createTaskType(@RequestParam UUID tenantId, @RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String unit = payload.get("unit");
        if (name != null) name = name.replace("\"", "");
        return ResponseEntity.ok(service.createTaskType(tenantId, name, unit));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTaskType(@PathVariable UUID id) {
        service.deleteTaskType(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/unit")
    public ResponseEntity<TaskType> updateTaskUnit(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        String unit = payload.get("unit");
        return ResponseEntity.ok(service.updateTaskUnit(id, unit));
    }
}
