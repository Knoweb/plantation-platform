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
        Optional<CropConfig> config = configRepository.findFirstByTenantIdAndCropTypeIgnoreCase(tenantId, cropType);
        return config.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(new CropConfig())); // Return empty if not found
    }

    @PostMapping
    public ResponseEntity<CropConfig> saveConfig(@RequestBody CropConfig newConfig) {
        Optional<CropConfig> existing = configRepository.findFirstByTenantIdAndCropTypeIgnoreCase(newConfig.getTenantId(), newConfig.getCropType());
        if (existing.isPresent()) {
            CropConfig configToUpdate = existing.get();
            configToUpdate.setCropType(newConfig.getCropType());
            if (newConfig.getBudgetYear() != null) configToUpdate.setBudgetYear(newConfig.getBudgetYear());
            if (newConfig.getBudgetApr() != null) configToUpdate.setBudgetApr(newConfig.getBudgetApr());
            if (newConfig.getBudgetMay() != null) configToUpdate.setBudgetMay(newConfig.getBudgetMay());
            if (newConfig.getBudgetJun() != null) configToUpdate.setBudgetJun(newConfig.getBudgetJun());
            if (newConfig.getBudgetJul() != null) configToUpdate.setBudgetJul(newConfig.getBudgetJul());
            if (newConfig.getBudgetAug() != null) configToUpdate.setBudgetAug(newConfig.getBudgetAug());
            if (newConfig.getBudgetSep() != null) configToUpdate.setBudgetSep(newConfig.getBudgetSep());
            if (newConfig.getBudgetOct() != null) configToUpdate.setBudgetOct(newConfig.getBudgetOct());
            if (newConfig.getBudgetNov() != null) configToUpdate.setBudgetNov(newConfig.getBudgetNov());
            if (newConfig.getBudgetDec() != null) configToUpdate.setBudgetDec(newConfig.getBudgetDec());
            if (newConfig.getBudgetJan() != null) configToUpdate.setBudgetJan(newConfig.getBudgetJan());
            if (newConfig.getBudgetFeb() != null) configToUpdate.setBudgetFeb(newConfig.getBudgetFeb());
            if (newConfig.getBudgetMar() != null) configToUpdate.setBudgetMar(newConfig.getBudgetMar());
            if (newConfig.getAththamaWage() != null) configToUpdate.setAththamaWage(newConfig.getAththamaWage());
            if (newConfig.getOverKiloRate() != null) configToUpdate.setOverKiloRate(newConfig.getOverKiloRate());
            if (newConfig.getCashKiloRate() != null) configToUpdate.setCashKiloRate(newConfig.getCashKiloRate());
            if (newConfig.getCostItems() != null) configToUpdate.setCostItems(newConfig.getCostItems());
            return ResponseEntity.ok(configRepository.save(configToUpdate));
        } else {
            return ResponseEntity.ok(configRepository.save(newConfig));
        }
    }
}
