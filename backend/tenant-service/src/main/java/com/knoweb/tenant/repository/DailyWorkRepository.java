package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.DailyWork;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DailyWorkRepository extends JpaRepository<DailyWork, UUID> {
    List<DailyWork> findByTenantId(UUID tenantId);

    List<DailyWork> findByTenantIdAndStatus(UUID tenantId, String status);

    List<DailyWork> findByTenantIdAndDivisionId(UUID tenantId, String divisionId);
}
