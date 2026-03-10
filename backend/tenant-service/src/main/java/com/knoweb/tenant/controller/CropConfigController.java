package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.CropConfig;
import com.knoweb.tenant.repository.CropConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/crop-configs")
public class CropConfigController {

    @Autowired
    private CropConfigRepository configRepository;

    @GetMapping
    public ResponseEntity<CropConfig> getConfig(@RequestParam String tenantId, @RequestParam String cropType) {
        Optional<CropConfig> config = configRepository.findByTenantIdAndCropType(tenantId, cropType);
        return config.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(new CropConfig())); // Return empty if not found
    }

    @PostMapping
    public ResponseEntity<CropConfig> saveConfig(@RequestBody CropConfig newConfig) {
        Optional<CropConfig> existing = configRepository.findByTenantIdAndCropType(newConfig.getTenantId(), newConfig.getCropType());
        if (existing.isPresent()) {
            CropConfig configToUpdate = existing.get();
            configToUpdate.setBudgetYear(newConfig.getBudgetYear());
            configToUpdate.setBudgetApr(newConfig.getBudgetApr());
            configToUpdate.setBudgetMay(newConfig.getBudgetMay());
            configToUpdate.setBudgetJun(newConfig.getBudgetJun());
            configToUpdate.setBudgetJul(newConfig.getBudgetJul());
            configToUpdate.setBudgetAug(newConfig.getBudgetAug());
            configToUpdate.setBudgetSep(newConfig.getBudgetSep());
            configToUpdate.setBudgetOct(newConfig.getBudgetOct());
            configToUpdate.setBudgetNov(newConfig.getBudgetNov());
            configToUpdate.setBudgetDec(newConfig.getBudgetDec());
            configToUpdate.setBudgetJan(newConfig.getBudgetJan());
            configToUpdate.setBudgetFeb(newConfig.getBudgetFeb());
            configToUpdate.setBudgetMar(newConfig.getBudgetMar());
            configToUpdate.setAththamaWage(newConfig.getAththamaWage());
            configToUpdate.setOverKiloRate(newConfig.getOverKiloRate());
            configToUpdate.setCashKiloRate(newConfig.getCashKiloRate());
            configToUpdate.setCostItems(newConfig.getCostItems());
            return ResponseEntity.ok(configRepository.save(configToUpdate));
        } else {
            return ResponseEntity.ok(configRepository.save(newConfig));
        }
    }
}
