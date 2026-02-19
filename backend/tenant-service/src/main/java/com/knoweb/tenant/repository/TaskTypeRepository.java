package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.TaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskTypeRepository extends JpaRepository<TaskType, UUID> {
    List<TaskType> findByTenantId(UUID tenantId);
    List<TaskType> findByTenantIdAndIsActiveTrue(UUID tenantId);
    Optional<TaskType> findByTenantIdAndName(UUID tenantId, String name);
}
