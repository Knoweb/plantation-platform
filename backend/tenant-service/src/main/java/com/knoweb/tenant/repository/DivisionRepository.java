package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.Division;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DivisionRepository extends JpaRepository<Division, UUID> {
    List<Division> findByTenantId(UUID tenantId);
}
