package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.DailyCost;
import com.knoweb.tenant.repository.DailyCostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/daily-costs")
@RequiredArgsConstructor
public class DailyCostController {

    private final DailyCostRepository dailyCostRepository;

    @GetMapping
    public ResponseEntity<DailyCost> getDailyCost(
            @RequestParam String tenantId,
            @RequestParam String cropType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        Optional<DailyCost> dailyCost = dailyCostRepository.findByTenantIdAndCropTypeAndDate(tenantId, cropType, date);
        return dailyCost.map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/range")
    public ResponseEntity<List<DailyCost>> getDailyCostsInRange(
            @RequestParam String tenantId,
            @RequestParam String cropType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        List<DailyCost> costs = dailyCostRepository.findByTenantIdAndCropTypeAndDateBetween(tenantId, cropType, startDate, endDate);
        return ResponseEntity.ok(costs);
    }

    @PostMapping
    public ResponseEntity<DailyCost> saveDailyCost(@RequestBody DailyCost request) {
        Optional<DailyCost> existing = dailyCostRepository.findByTenantIdAndCropTypeAndDate(
                request.getTenantId(), request.getCropType(), request.getDate()
        );
        
        if (existing.isPresent()) {
            DailyCost toUpdate = existing.get();
            toUpdate.setCostData(request.getCostData());
            return ResponseEntity.ok(dailyCostRepository.save(toUpdate));
        } else {
            return ResponseEntity.ok(dailyCostRepository.save(request));
        }
    }
}
