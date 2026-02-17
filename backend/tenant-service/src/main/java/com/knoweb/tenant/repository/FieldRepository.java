package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.Field;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FieldRepository extends JpaRepository<Field, UUID> {
    List<Field> findByDivisionId(UUID divisionId);

    List<Field> findByTenantId(UUID tenantId);
    
    List<Field> findByDivisionIdIn(List<UUID> divisionIds);
}
