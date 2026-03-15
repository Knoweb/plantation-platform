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

    // Default crop type mapping for seeded tasks
    private static final java.util.Map<String, String> DEFAULT_CROP_TYPES = new java.util.HashMap<>() {{
        put("Plucking", "TEA");
        put("Blister Blight", "TEA");
        put("Pruning", "TEA");
        put("Mossing and Ferning", "TEA");
        put("Sack cooli", "GENERAL");
        put("Kangani", "GENERAL");
        put("Chemical Weeding", "GENERAL");
        put("Manual Weeding", "GENERAL");
        put("Fertilizer application", "GENERAL");
        put("Folior Spray", "GENERAL");
        put("Dolomites application", "GENERAL");
        put("Roads", "GENERAL");
        put("Boundries", "GENERAL");
        put("Drains", "GENERAL");
        put("Tipping", "GENERAL");
        put("Terracing", "GENERAL");
        put("Lime Spray", "GENERAL");
        put("Transport", "GENERAL");
        put("Watcher", "GENERAL");
        put("Sundry", "GENERAL");
        put("Other", "GENERAL");
    }};

    public TaskTypeService(TaskTypeRepository repository) {
        this.repository = repository;
    }

    public List<TaskType> getTaskTypes(UUID tenantId) {
        List<TaskType> types = repository.findByTenantIdAndIsActiveTrue(tenantId);
        if (types.isEmpty()) {
            return seedDefaultTasks(tenantId);
        }
        // Auto-patch any existing tasks that have no crop_type assigned yet
        // (migrates tasks seeded before the crop_type column was added)
        boolean anyPatched = false;
        
        // Prepare a case-insensitive map for lookup
        java.util.Map<String, String> lookupMap = new java.util.HashMap<>();
        DEFAULT_CROP_TYPES.forEach((k, v) -> lookupMap.put(k.toLowerCase().trim(), v));

        for (TaskType task : types) {
            if (task.getCropType() == null || task.getCropType().trim().isEmpty()) {
                String taskNameKey = task.getName() != null ? task.getName().toLowerCase().trim() : "";
                String defaultCrop = lookupMap.getOrDefault(taskNameKey, "GENERAL");
                task.setCropType(defaultCrop);
                repository.save(task);
                anyPatched = true;
            }
        }
        if (anyPatched) {
            return repository.findByTenantIdAndIsActiveTrue(tenantId);
        }
        return types;
    }

    public List<TaskType> getAllTaskTypes(UUID tenantId) {
        return repository.findByTenantId(tenantId);
    }

    public TaskType createTaskType(UUID tenantId, String name, String expectedUnit) {
        return createTaskType(tenantId, name, expectedUnit, "GENERAL");
    }

    public TaskType createTaskType(UUID tenantId, String name, String expectedUnit, String cropType) {
        Optional<TaskType> existing = repository.findByTenantIdAndName(tenantId, name);
        if (existing.isPresent()) {
            TaskType task = existing.get();
            if (!task.getActive()) {
                task.setActive(true);
                task.setExpectedUnit(expectedUnit);
                if (cropType != null) task.setCropType(normalizeCropType(cropType));
                return repository.save(task);
            }
            task.setExpectedUnit(expectedUnit);
            if (cropType != null) task.setCropType(normalizeCropType(cropType));
            return repository.save(task);
        }
        TaskType newTask = new TaskType(tenantId, name, expectedUnit);
        if (cropType != null) newTask.setCropType(normalizeCropType(cropType));
        return repository.save(newTask);
    }

    public void deleteTaskType(UUID id) {
        repository.findById(id).ifPresent(task -> {
            task.setActive(false); // Soft delete
            repository.save(task);
        });
    }

    public TaskType updateTaskUnit(UUID id, String expectedUnit) {
        return repository.findById(id).map(task -> {
            task.setExpectedUnit(expectedUnit);
            return repository.save(task);
        }).orElseThrow(() -> new RuntimeException("Task not found"));
    }

    public TaskType updateCropType(UUID id, String cropType) {
        return repository.findById(id).map(task -> {
            task.setCropType(cropType != null ? normalizeCropType(cropType) : "GENERAL");
            return repository.save(task);
        }).orElseThrow(() -> new RuntimeException("Task not found"));
    }

    /**
     * Normalizes a crop type string that may be comma-separated.
     * e.g. "tea, rubber, GENERAL" -> "TEA,RUBBER,GENERAL"
     */
    private String normalizeCropType(String cropType) {
        if (cropType == null || cropType.trim().isEmpty()) return "GENERAL";
        return java.util.Arrays.stream(cropType.split(","))
            .map(String::trim)
            .map(String::toUpperCase)
            .filter(s -> !s.isEmpty())
            .collect(java.util.stream.Collectors.joining(","));
    }

    private List<TaskType> seedDefaultTasks(UUID tenantId) {
        DEFAULT_TASKS.forEach(name -> {
            if (repository.findByTenantIdAndName(tenantId, name).isEmpty()) {
                String unit = name.equals("Plucking") ? "Kg" : (name.contains("Weeding") ? "Acres" : "Task");
                String cropType = DEFAULT_CROP_TYPES.getOrDefault(name, "GENERAL");
                TaskType task = new TaskType(tenantId, name, unit);
                task.setCropType(cropType);
                repository.save(task);
            }
        });
        return repository.findByTenantIdAndIsActiveTrue(tenantId);
    }
}
