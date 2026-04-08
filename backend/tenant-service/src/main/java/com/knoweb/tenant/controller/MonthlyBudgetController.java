package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.MonthlyBudget;
import com.knoweb.tenant.repository.MonthlyBudgetRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/monthly-budgets")
public class MonthlyBudgetController {

    private final MonthlyBudgetRepository monthlyBudgetRepository;

    public MonthlyBudgetController(MonthlyBudgetRepository monthlyBudgetRepository) {
        this.monthlyBudgetRepository = monthlyBudgetRepository;
    }

    @GetMapping
    public ResponseEntity<List<MonthlyBudget>> getBudgets(
            @RequestParam String tenantId,
            @RequestParam String cropType,
            @RequestParam String yearMonth) {
        return ResponseEntity.ok(monthlyBudgetRepository.findByTenantIdAndCropTypeIgnoreCaseAndYearMonth(tenantId, cropType, yearMonth));
    }

    @PostMapping
    public ResponseEntity<MonthlyBudget> saveBudget(@RequestBody MonthlyBudget request) {
        Optional<MonthlyBudget> existing = monthlyBudgetRepository.findByTenantIdAndCropTypeIgnoreCaseAndYearMonthAndItemName(
                request.getTenantId(),
                request.getCropType(),
                request.getYearMonth(),
                request.getItemName()
        );

        if (existing.isPresent()) {
            MonthlyBudget toUpdate = existing.get();
            toUpdate.setAmount(request.getAmount());
            return ResponseEntity.ok(monthlyBudgetRepository.save(toUpdate));
        }

        return ResponseEntity.ok(monthlyBudgetRepository.save(request));
    }
}
