package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.FertilizerProgrammeRow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FertilizerProgrammeRowRepository extends JpaRepository<FertilizerProgrammeRow, UUID> {
    List<FertilizerProgrammeRow> findByTenantIdAndDivisionIdAndPlanMonth(UUID tenantId, UUID divisionId, String planMonth);

    List<FertilizerProgrammeRow> findByTenantIdAndDivisionIdAndCropTypeAndPlanMonth(UUID tenantId, UUID divisionId, String cropType, String planMonth);

    Optional<FertilizerProgrammeRow> findByTenantIdAndDivisionIdAndCropTypeAndFieldIdAndPlanMonth(
            UUID tenantId,
            UUID divisionId,
            String cropType,
            UUID fieldId,
            String planMonth
    );
}

