package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.CropConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CropConfigRepository extends JpaRepository<CropConfig, UUID> {
    Optional<CropConfig> findByTenantIdAndCropType(String tenantId, String cropType);
}
