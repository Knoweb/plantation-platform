package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.FertilizerApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FertilizerApplicationRepository extends JpaRepository<FertilizerApplication, UUID> {
    List<FertilizerApplication> findByTenantIdAndDivisionIdAndYear(UUID tenantId, UUID divisionId, Integer year);
    List<FertilizerApplication> findByTenantIdAndDivisionIdAndYearAndMonth(UUID tenantId, UUID divisionId, Integer year, Integer month);
    List<FertilizerApplication> findByTenantIdAndDivisionId(UUID tenantId, UUID divisionId);
}

