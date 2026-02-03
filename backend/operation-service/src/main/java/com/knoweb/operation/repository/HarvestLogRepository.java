package com.knoweb.operation.repository;

import com.knoweb.operation.entity.HarvestLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HarvestLogRepository extends JpaRepository<HarvestLog, Long> {
    List<HarvestLog> findByTenantIdOrderByDateDesc(String tenantId);
}
