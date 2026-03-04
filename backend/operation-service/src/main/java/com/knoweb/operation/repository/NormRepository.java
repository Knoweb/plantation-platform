package com.knoweb.operation.repository;

import com.knoweb.operation.entity.Norm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NormRepository extends JpaRepository<Norm, UUID> {

    List<Norm> findByTenantIdOrderByEffectiveDateDesc(UUID tenantId);

    // Get the active norm for a specific job role up to the given date
    @Query("SELECT n FROM Norm n WHERE n.tenantId = :tenantId AND n.jobRole = :jobRole AND n.effectiveDate <= :targetDate AND (n.endDate IS NULL OR n.endDate >= :targetDate) ORDER BY n.effectiveDate DESC LIMIT 1")
    Optional<Norm> findActiveNormForRole(
            @Param("tenantId") UUID tenantId, 
            @Param("jobRole") String jobRole, 
            @Param("targetDate") LocalDate targetDate
    );
}
