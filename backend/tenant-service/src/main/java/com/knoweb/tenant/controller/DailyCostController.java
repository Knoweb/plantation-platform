package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.DailyCost;
import com.knoweb.tenant.repository.DailyCostRepository;
import com.knoweb.tenant.service.CostCalculationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/daily-costs")
public class DailyCostController {

    private final DailyCostRepository dailyCostRepository;
    private final CostCalculationService costCalculationService;
    private final com.knoweb.tenant.repository.CropConfigRepository cropConfigRepository;

    public DailyCostController(DailyCostRepository dailyCostRepository, CostCalculationService costCalculationService, com.knoweb.tenant.repository.CropConfigRepository cropConfigRepository) {
        this.dailyCostRepository = dailyCostRepository;
        this.costCalculationService = costCalculationService;
        this.cropConfigRepository = cropConfigRepository;
    }

    @GetMapping
    public ResponseEntity<DailyCost> getDailyCost(
            @RequestParam String tenantId,
            @RequestParam String cropType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        Optional<DailyCost> dailyCost = dailyCostRepository.findByTenantIdAndCropTypeAndDate(tenantId, cropType, date);
        if (dailyCost.isPresent()) {
            DailyCost cost = dailyCost.get();
            // Dynamically calculate on read to ensure Todate/YTD are completely up-to-date
            String updatedCostData = costCalculationService.calculateAmounts(tenantId, cropType, date, cost.getCostData());
            cost.setCostData(updatedCostData);
            return ResponseEntity.ok(cost);
        } else {
            // Generate a dynamic summary for a date even if chief clerk hasn't entered 'Day' data yet
            Optional<com.knoweb.tenant.entity.CropConfig> config = cropConfigRepository.findByTenantIdAndCropType(tenantId, cropType);
            if (config.isPresent() && config.get().getCostItems() != null) {
                // Remove dayAmount fields from the config structure if any exist
                String emptyCostItems = config.get().getCostItems().replaceAll("\"dayAmount\":\"[^\"]*\"", "\"dayAmount\":\"0.00\"");
                // Pass it to compute cumulative sums up to this exact date, with day amounts effectively set to zero for today
                String calculatedCostData = costCalculationService.calculateAmounts(tenantId, cropType, date, emptyCostItems);
                
                DailyCost dynamicCost = new DailyCost();
                dynamicCost.setTenantId(tenantId);
                dynamicCost.setCropType(cropType);
                dynamicCost.setDate(date);
                dynamicCost.setCostData(calculatedCostData);
                return ResponseEntity.ok(dynamicCost);
            }
        }
        return ResponseEntity.noContent().build();
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
        
        // Calculate Todate, Last Month, and YTD amounts before saving
        String calculatedCostData = costCalculationService.calculateAmounts(
                request.getTenantId(), 
                request.getCropType(), 
                request.getDate(), 
                request.getCostData()
        );

        if (existing.isPresent()) {
            DailyCost toUpdate = existing.get();
            toUpdate.setCostData(calculatedCostData);
            return ResponseEntity.ok(dailyCostRepository.save(toUpdate));
        } else {
            request.setCostData(calculatedCostData);
            return ResponseEntity.ok(dailyCostRepository.save(request));
        }
    }
}
