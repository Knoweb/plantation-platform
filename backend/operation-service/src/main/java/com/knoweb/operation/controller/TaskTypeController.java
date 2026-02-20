package com.knoweb.operation.controller;

import com.knoweb.operation.entity.TaskType;
import com.knoweb.operation.service.TaskTypeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.util.List;

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
    public ResponseEntity<TaskType> createTaskType(@RequestParam UUID tenantId, @RequestBody String name) {
        // Strip quotes if present (simple body parsing)
        String cleanName = name.replace("\"", "");
        return ResponseEntity.ok(service.createTaskType(tenantId, cleanName));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTaskType(@PathVariable UUID id) {
        service.deleteTaskType(id);
        return ResponseEntity.ok().build();
    }
}
