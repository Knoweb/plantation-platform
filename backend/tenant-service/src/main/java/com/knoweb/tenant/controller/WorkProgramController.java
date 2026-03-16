package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.WorkProgram;
import com.knoweb.tenant.repository.WorkProgramRepository;
import com.knoweb.tenant.websocket.WorkProgramRealtimePublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/work-program")
public class WorkProgramController {

    private final WorkProgramRepository workProgramRepository;
    private final WorkProgramRealtimePublisher realtimePublisher;

    public WorkProgramController(WorkProgramRepository workProgramRepository, WorkProgramRealtimePublisher realtimePublisher) {
        this.workProgramRepository = workProgramRepository;
        this.realtimePublisher = realtimePublisher;
    }

    /**
     * GET /api/work-program?tenantId=...&year=...&month=...
     * Returns all work program entries for a given tenant + year + month
     */
    @GetMapping
    public ResponseEntity<List<WorkProgram>> getWorkProgram(
            @RequestParam String tenantId,
            @RequestParam int year,
            @RequestParam int month) {
        List<WorkProgram> programs = workProgramRepository.findByTenantIdAndYearAndMonth(tenantId, year, month);
        return ResponseEntity.ok(programs);
    }

    /**
     * POST /api/work-program
     * Upsert a single task's workers-needed value for a given month.
     * Body: { tenantId, year, month, taskName, workersNeeded }
     */
    @PostMapping
    public ResponseEntity<WorkProgram> saveWorkProgram(@RequestBody WorkProgram request) {
        Optional<WorkProgram> existing = workProgramRepository.findByTenantIdAndYearAndMonthAndTaskName(
                request.getTenantId(), request.getYear(), request.getMonth(), request.getTaskName());

        WorkProgram toSave;
        if (existing.isPresent()) {
            toSave = existing.get();
            toSave.setWorkersNeeded(request.getWorkersNeeded());
        } else {
            toSave = request;
        }
        WorkProgram saved = workProgramRepository.save(toSave);
        realtimePublisher.broadcastUpdated(saved.getTenantId(), saved.getYear(), saved.getMonth());
        return ResponseEntity.ok(saved);
    }

    /**
     * POST /api/work-program/bulk
     * Upsert all tasks at once.
     * Body: { tenantId, year, month, entries: { taskName: workersNeeded, ... } }
     */
    @PostMapping("/bulk")
    public ResponseEntity<Void> saveWorkProgramBulk(@RequestBody Map<String, Object> body) {
        String tenantId = (String) body.get("tenantId");
        int year = ((Number) body.get("year")).intValue();
        int month = ((Number) body.get("month")).intValue();

        @SuppressWarnings("unchecked")
        Map<String, Number> entries = (Map<String, Number>) body.get("entries");
        if (entries == null) return ResponseEntity.badRequest().build();

        entries.forEach((taskName, workersNeeded) -> {
            Optional<WorkProgram> existing = workProgramRepository.findByTenantIdAndYearAndMonthAndTaskName(
                    tenantId, year, month, taskName);

            WorkProgram wp;
            if (existing.isPresent()) {
                wp = existing.get();
                wp.setWorkersNeeded(workersNeeded.intValue());
            } else {
                wp = new WorkProgram();
                wp.setTenantId(tenantId);
                wp.setYear(year);
                wp.setMonth(month);
                wp.setTaskName(taskName);
                wp.setWorkersNeeded(workersNeeded.intValue());
            }
            workProgramRepository.save(wp);
        });

        realtimePublisher.broadcastUpdated(tenantId, year, month);
        return ResponseEntity.ok().build();
    }
}
