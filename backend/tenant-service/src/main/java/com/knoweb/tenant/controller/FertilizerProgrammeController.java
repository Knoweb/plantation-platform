package com.knoweb.tenant.controller;

import com.knoweb.tenant.dto.FertilizerProgrammeRowDto;
import com.knoweb.tenant.service.FertilizerProgrammeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/fertilizer-programme")
public class FertilizerProgrammeController {

    private final FertilizerProgrammeService fertilizerProgrammeService;

    public FertilizerProgrammeController(FertilizerProgrammeService fertilizerProgrammeService) {
        this.fertilizerProgrammeService = fertilizerProgrammeService;
    }

    @GetMapping
    public ResponseEntity<?> getProgramme(
            @RequestParam UUID tenantId,
            @RequestParam UUID divisionId,
            @RequestParam(required = false) String cropType,
            @RequestParam String planMonth
    ) {
        try {
            return ResponseEntity.ok(fertilizerProgrammeService.getProgramme(tenantId, divisionId, cropType, planMonth));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping
    public ResponseEntity<?> upsertRows(@RequestBody List<FertilizerProgrammeRowDto> rows) {
        try {
            return ResponseEntity.ok(fertilizerProgrammeService.upsertProgrammeRows(rows));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}

