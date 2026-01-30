package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    Optional<Tenant> findBySubDomain(String subDomain);
}
