package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.FertilizerMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FertilizerMasterRepository extends JpaRepository<FertilizerMaster, UUID> {
    List<FertilizerMaster> findByTenantId(UUID tenantId);
    Optional<FertilizerMaster> findByTenantIdAndNameIgnoreCase(UUID tenantId, String name);
}

