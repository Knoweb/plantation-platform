package com.knoweb.operation.service;

import com.knoweb.operation.entity.TaskType;
import com.knoweb.operation.repository.TaskTypeRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TaskTypeService {

    private final TaskTypeRepository repository;

    private static final List<String> DEFAULT_TASKS = Arrays.asList(
            "Plucking", "Sack cooli", "Kangani", "Chemical Weeding", "Manual Weeding",
            "Fertilizer application", "Blister Blight", "Folior Spray", "Dolomites application",
            "Roads", "Boundries", "Drains", "Pruning", "Mossing and Ferning",
            "Tipping", "Terracing", "Lime Spray", "Transport", "Watcher", "Sundry", "Other"
    );

    public TaskTypeService(TaskTypeRepository repository) {
        this.repository = repository;
    }

    public List<TaskType> getTaskTypes(UUID tenantId) {
        List<TaskType> types = repository.findByTenantIdAndIsActiveTrue(tenantId);
        if (types.isEmpty()) {
            return seedDefaultTasks(tenantId);
        }
        return types; // Return active tasks
    }

    public List<TaskType> getAllTaskTypes(UUID tenantId) {
        return repository.findByTenantId(tenantId);
    }

    public TaskType createTaskType(UUID tenantId, String name) {
        Optional<TaskType> existing = repository.findByTenantIdAndName(tenantId, name);
        if (existing.isPresent()) {
            TaskType task = existing.get();
            if (!task.getActive()) {
                task.setActive(true);
                return repository.save(task);
            }
            return task;
        }
        return repository.save(new TaskType(tenantId, name));
    }

    public void deleteTaskType(UUID id) {
        repository.findById(id).ifPresent(task -> {
            task.setActive(false); // Soft delete
            repository.save(task);
        });
    }

    private List<TaskType> seedDefaultTasks(UUID tenantId) {
        DEFAULT_TASKS.forEach(name -> {
            if (repository.findByTenantIdAndName(tenantId, name).isEmpty()) {
                repository.save(new TaskType(tenantId, name));
            }
        });
        return repository.findByTenantIdAndIsActiveTrue(tenantId);
    }
}
