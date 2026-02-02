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
        System.out.println("DEBUG: Creating Tenant: " + request.getCompanyName());
        // 1. Validation
        if (tenantRepository.findBySubDomain(request.getSubDomain()).isPresent()) {
            throw new RuntimeException("Subdomain already exists");
        }
        // Check Global Username Duplication (if required by business rule, though DB
        // constraint is per tenant)
        // If we want globally unique usernames:
        if (userRepository.findByUsername(request.getAdminUsername()).isPresent()) {
            throw new RuntimeException("Username already taken. Please choose another.");
        }

        try {
            // 2. Create Tenant
            Tenant tenant = new Tenant();
            tenant.setCompanyName(request.getCompanyName());
            tenant.setSubDomain(request.getSubDomain());
            tenant.setLogoUrl(request.getLogoUrl()); // Set Logo
            tenant.setSubscriptionStatus("ACTIVE");
            tenant.setConfigJson(request.getConfigJson());
            tenant.setCreatedAt(LocalDateTime.now());

            tenant = tenantRepository.save(tenant);

            // 3. Create Admin User (ESTATE OWNER)
            User adminUser = new User();
            adminUser.setTenantId(tenant.getTenantId());
            adminUser.setFullName(request.getCompanyName() + " Owner");
            adminUser.setUsername(request.getAdminUsername());
            adminUser.setPasswordHash(request.getAdminPassword());
            adminUser.setRole("ESTATE_ADMIN");

            System.out.println("DEBUG: Saving Admin User: " + adminUser.getUsername());
            userRepository.save(adminUser);

            return tenant;
        } catch (Exception e) {
            e.printStackTrace();
            try {
                java.nio.file.Files.writeString(
                        java.nio.file.Path.of("tenant_error.log"),
                        e.toString() + "\n" + java.util.Arrays.toString(e.getStackTrace()));
            } catch (java.io.IOException ioException) {
                // Ignore
            }
            throw new RuntimeException("Error creating tenant: " + e.getMessage());
        }
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
        System.out.println("DEBUG: Login Attempt for: " + request.getUsername());

        // 1. Find User
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    System.out.println("DEBUG: User not found!");
                    return new RuntimeException("Invalid credentials");
                });

        System.out.println(
                "DEBUG: User Found. DB Pass: " + user.getPasswordHash() + ", Input Pass: " + request.getPassword());

        // 2. Verify Password (Simple check for now)
        if (user.getPasswordHash() == null || !user.getPasswordHash().equals(request.getPassword())) {
            System.out.println("DEBUG: Password Mismatch!");
            throw new RuntimeException("Invalid credentials");
        }

        System.out.println("DEBUG: Login Success!");

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
        user.setEmail(request.getEmail());
        user.setPasswordHash(request.getPassword());
        user.setRole(request.getRole());
        user.setDivisionAccess(request.getDivisionAccess());

        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(java.util.UUID userId, UserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check for duplicate username if changed
        if (!user.getUsername().equals(request.getUsername()) &&
                userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());
        user.setDivisionAccess(request.getDivisionAccess());

        // Update password only if provided and not empty
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPasswordHash(request.getPassword());
        }

        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(java.util.UUID userId) {
        userRepository.deleteById(userId);
    }
}
