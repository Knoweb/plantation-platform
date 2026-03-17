package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.DailyCost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

public interface DailyCostRepository extends JpaRepository<DailyCost, Long> {
    Optional<DailyCost> findByTenantIdAndCropTypeAndDate(String tenantId, String cropType, LocalDate date);
    List<DailyCost> findByTenantIdAndCropTypeAndDateBetween(String tenantId, String cropType, LocalDate startDate, LocalDate endDate);
    Optional<DailyCost> findByTenantIdAndCropTypeIgnoreCaseAndDate(String tenantId, String cropType, LocalDate date);
    List<DailyCost> findByTenantIdAndCropTypeIgnoreCaseAndDateBetween(String tenantId, String cropType, LocalDate startDate, LocalDate endDate);
}
