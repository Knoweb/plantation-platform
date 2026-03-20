package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.FertilizerTargetRatio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FertilizerTargetRatioRepository extends JpaRepository<FertilizerTargetRatio, UUID> {
    List<FertilizerTargetRatio> findByTenantIdAndDivisionIdAndCropTypeAndPlanMonth(
            UUID tenantId,
            UUID divisionId,
            String cropType,
            String planMonth
    );

    Optional<FertilizerTargetRatio> findByTenantIdAndDivisionIdAndCropTypeAndFieldIdAndPlanMonth(
            UUID tenantId,
            UUID divisionId,
            String cropType,
            UUID fieldId,
            String planMonth
    );
}

