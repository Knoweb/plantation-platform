package com.knoweb.tenant.service;

import com.knoweb.tenant.dto.AuthRequest;
import com.knoweb.tenant.dto.AuthResponse;
import com.knoweb.tenant.dto.TenantRequest;
import com.knoweb.tenant.dto.UserRequest;
import com.knoweb.tenant.entity.Tenant;
import com.knoweb.tenant.entity.User;
import com.knoweb.tenant.repository.TenantRepository;
import com.knoweb.tenant.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;

    public TenantService(TenantRepository tenantRepository, UserRepository userRepository) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Tenant createTenant(TenantRequest request) {
        // 1. Validation
        if (tenantRepository.findBySubDomain(request.getSubDomain()).isPresent()) {
            throw new RuntimeException("Subdomain already exists");
        }

        // 2. Create Tenant
        Tenant tenant = new Tenant();
        tenant.setCompanyName(request.getCompanyName());
        tenant.setSubDomain(request.getSubDomain());
        tenant.setLogoUrl(request.getLogoUrl()); // Set Logo
        tenant.setSubscriptionStatus("ACTIVE");
        tenant.setConfigJson(request.getConfigJson());
        tenant.setCreatedAt(LocalDateTime.now());

        tenant = tenantRepository.save(tenant);

        // 3. Create Admin User
        User adminUser = new User();
        adminUser.setTenantId(tenant.getTenantId());
        adminUser.setFullName(request.getCompanyName() + " Admin");
        adminUser.setUsername(request.getAdminUsername());
        adminUser.setPasswordHash(request.getAdminPassword());
        adminUser.setRole("MANAGER");

        userRepository.save(adminUser);

        return tenant;
    }

    public java.util.List<Tenant> getAllTenants() {
        return tenantRepository.findAll();
    }

    @Transactional
    public void deleteTenant(java.util.UUID tenantId) {
        tenantRepository.deleteById(tenantId);
    }

    @Transactional
    public Tenant updateTenantStatus(java.util.UUID tenantId, String status) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));
        tenant.setSubscriptionStatus(status);
        return tenantRepository.save(tenant);
    }

    public Tenant getTenantById(java.util.UUID tenantId) {
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));
    }

    public java.util.List<User> getTenantUsers(java.util.UUID tenantId) {
        return userRepository.findByTenantId(tenantId);
    }

    public AuthResponse login(AuthRequest request) {
        // 1. Find User
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        // 2. Verify Password (Simple check for now)
        if (!user.getPasswordHash().equals(request.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        // 3. Get Tenant Details
        Tenant tenant = tenantRepository.findById(user.getTenantId())
                .orElseThrow(() -> new RuntimeException("Tenant configuration error"));

        // 4. Return Response
        return new AuthResponse(
                user.getUserId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole(),
                tenant.getTenantId(),
                tenant.getCompanyName(),
                tenant.getLogoUrl(),
                tenant.getSubDomain());
    }

    @Transactional
    public User createUser(UserRequest request) {
        // Validation: Check if username exists
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();
        user.setTenantId(request.getTenantId());
        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        user.setPasswordHash(request.getPassword()); // In real app, hash this!
        user.setRole(request.getRole());

        return userRepository.save(user);
    }
}
