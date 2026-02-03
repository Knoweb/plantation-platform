package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByTenantIdAndUsername(UUID tenantId, String username);

    Optional<User> findByUsername(String username);

    java.util.List<User> findByTenantId(UUID tenantId);

    Optional<User> findByEmail(String email);

    Optional<User> findByResetToken(String resetToken);
}
