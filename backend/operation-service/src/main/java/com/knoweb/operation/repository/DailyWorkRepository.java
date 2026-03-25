package com.knoweb.operation.repository;

import com.knoweb.operation.entity.DailyWork;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import java.time.LocalDate;

public interface DailyWorkRepository extends JpaRepository<DailyWork, UUID> {
    List<DailyWork> findByTenantId(UUID tenantId);
    List<DailyWork> findByTenantIdAndStatus(UUID tenantId, String status);
    List<DailyWork> findByTenantIdAndDivisionId(UUID tenantId, String divisionId);
    Optional<DailyWork> findTopByTenantIdAndDivisionIdAndWorkDateOrderByCreatedAtDesc(UUID tenantId, String divisionId, LocalDate workDate);
}
