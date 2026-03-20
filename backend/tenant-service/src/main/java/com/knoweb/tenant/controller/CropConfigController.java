package com.knoweb.tenant.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knoweb.tenant.entity.CropConfig;
import com.knoweb.tenant.repository.CropConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/crop-configs")
public class CropConfigController {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private CropConfigRepository configRepository;

    @GetMapping
    public ResponseEntity<CropConfig> getConfig(@RequestParam String tenantId, @RequestParam String cropType) {
        Optional<CropConfig> config = configRepository.findFirstByTenantIdAndCropTypeIgnoreCase(tenantId, cropType);
        return config.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(new CropConfig())); // Return empty if not found
    }

    @PostMapping
    public ResponseEntity<?> saveConfig(@RequestBody CropConfig newConfig) {
        String workingDaysValidationError = validateWorkingDays(newConfig);
        if (workingDaysValidationError != null) {
            return ResponseEntity.badRequest().body(Map.of("message", workingDaysValidationError));
        }
        String workingDayCalendarValidationError = validateWorkingDayCalendar(newConfig.getWorkingDayCalendar());
        if (workingDayCalendarValidationError != null) {
            return ResponseEntity.badRequest().body(Map.of("message", workingDayCalendarValidationError));
        }

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
            if (newConfig.getWorkingDaysApr() != null) configToUpdate.setWorkingDaysApr(newConfig.getWorkingDaysApr());
            if (newConfig.getWorkingDaysMay() != null) configToUpdate.setWorkingDaysMay(newConfig.getWorkingDaysMay());
            if (newConfig.getWorkingDaysJun() != null) configToUpdate.setWorkingDaysJun(newConfig.getWorkingDaysJun());
            if (newConfig.getWorkingDaysJul() != null) configToUpdate.setWorkingDaysJul(newConfig.getWorkingDaysJul());
            if (newConfig.getWorkingDaysAug() != null) configToUpdate.setWorkingDaysAug(newConfig.getWorkingDaysAug());
            if (newConfig.getWorkingDaysSep() != null) configToUpdate.setWorkingDaysSep(newConfig.getWorkingDaysSep());
            if (newConfig.getWorkingDaysOct() != null) configToUpdate.setWorkingDaysOct(newConfig.getWorkingDaysOct());
            if (newConfig.getWorkingDaysNov() != null) configToUpdate.setWorkingDaysNov(newConfig.getWorkingDaysNov());
            if (newConfig.getWorkingDaysDec() != null) configToUpdate.setWorkingDaysDec(newConfig.getWorkingDaysDec());
            if (newConfig.getWorkingDaysJan() != null) configToUpdate.setWorkingDaysJan(newConfig.getWorkingDaysJan());
            if (newConfig.getWorkingDaysFeb() != null) configToUpdate.setWorkingDaysFeb(newConfig.getWorkingDaysFeb());
            if (newConfig.getWorkingDaysMar() != null) configToUpdate.setWorkingDaysMar(newConfig.getWorkingDaysMar());
            if (newConfig.getAththamaWage() != null) configToUpdate.setAththamaWage(newConfig.getAththamaWage());
            if (newConfig.getOverKiloRate() != null) configToUpdate.setOverKiloRate(newConfig.getOverKiloRate());
            if (newConfig.getCashKiloRate() != null) configToUpdate.setCashKiloRate(newConfig.getCashKiloRate());
            if (newConfig.getCostItems() != null) configToUpdate.setCostItems(newConfig.getCostItems());
            if (newConfig.getWorkingDayCalendar() != null) configToUpdate.setWorkingDayCalendar(newConfig.getWorkingDayCalendar());
            return ResponseEntity.ok(configRepository.save(configToUpdate));
        } else {
            return ResponseEntity.ok(configRepository.save(newConfig));
        }
    }

    private String validateWorkingDays(CropConfig config) {
        String[] validationErrors = {
                validateWorkingDayValue("April", config.getWorkingDaysApr()),
                validateWorkingDayValue("May", config.getWorkingDaysMay()),
                validateWorkingDayValue("June", config.getWorkingDaysJun()),
                validateWorkingDayValue("July", config.getWorkingDaysJul()),
                validateWorkingDayValue("August", config.getWorkingDaysAug()),
                validateWorkingDayValue("September", config.getWorkingDaysSep()),
                validateWorkingDayValue("October", config.getWorkingDaysOct()),
                validateWorkingDayValue("November", config.getWorkingDaysNov()),
                validateWorkingDayValue("December", config.getWorkingDaysDec()),
                validateWorkingDayValue("January", config.getWorkingDaysJan()),
                validateWorkingDayValue("February", config.getWorkingDaysFeb()),
                validateWorkingDayValue("March", config.getWorkingDaysMar())
        };

        for (String error : validationErrors) {
            if (error != null) {
                return error;
            }
        }

        return null;
    }

    private String validateWorkingDayValue(String monthName, Double value) {
        if (value == null) {
            return null;
        }
        if (value < 0 || value > 31) {
            return monthName + " working days must be between 0 and 31.";
        }
        return null;
    }

    private String validateWorkingDayCalendar(String rawCalendarJson) {
        if (rawCalendarJson == null || rawCalendarJson.isBlank()) {
            return null;
        }

        try {
            Map<String, List<Integer>> calendar = objectMapper.readValue(
                    rawCalendarJson,
                    new TypeReference<Map<String, List<Integer>>>() {
                    });

            for (Map.Entry<String, List<Integer>> entry : calendar.entrySet()) {
                String monthKey = entry.getKey();
                if (!monthKey.matches("\\d{4}-\\d{2}")) {
                    return "Working day calendar keys must use YYYY-MM format.";
                }

                List<Integer> days = entry.getValue();
                if (days == null) {
                    continue;
                }

                for (Integer day : days) {
                    if (day == null || day < 1 || day > 31) {
                        return "Working day calendar entries must be between 1 and 31.";
                    }
                }
            }

            return null;
        } catch (IOException e) {
            return "Working day calendar format is invalid.";
        }
    }
}
