package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.MonthlyBudget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MonthlyBudgetRepository extends JpaRepository<MonthlyBudget, Long> {
    List<MonthlyBudget> findByTenantIdAndCropTypeIgnoreCaseAndYearMonth(String tenantId, String cropType, String yearMonth);
    Optional<MonthlyBudget> findByTenantIdAndCropTypeIgnoreCaseAndYearMonthAndItemName(String tenantId, String cropType, String yearMonth, String itemName);
}
