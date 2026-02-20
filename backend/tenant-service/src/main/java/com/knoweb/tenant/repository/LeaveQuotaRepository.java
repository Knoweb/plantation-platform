package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.LeaveQuota;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LeaveQuotaRepository extends JpaRepository<LeaveQuota, UUID> {
    Optional<LeaveQuota> findByUserId(UUID userId);
}
