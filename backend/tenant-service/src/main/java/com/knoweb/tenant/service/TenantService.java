package com.knoweb.tenant.service;

import com.knoweb.tenant.dto.AuthRequest;
import com.knoweb.tenant.dto.AuthResponse;
import com.knoweb.tenant.dto.TenantRequest;
import com.knoweb.tenant.dto.UserRequest;
import com.knoweb.tenant.entity.Tenant;
import com.knoweb.tenant.entity.User;
import com.knoweb.tenant.repository.TenantRepository;
import com.knoweb.tenant.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final com.knoweb.tenant.repository.DivisionRepository divisionRepository;
    private final PasswordEncoder passwordEncoder;

    public TenantService(TenantRepository tenantRepository, UserRepository userRepository,
            com.knoweb.tenant.repository.DivisionRepository divisionRepository,
            PasswordEncoder passwordEncoder) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.divisionRepository = divisionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Tenant createTenant(TenantRequest request) {
        System.out.println("DEBUG: Creating Tenant: " + request.getCompanyName());
        // 1. Validation
        if (tenantRepository.findBySubDomain(request.getSubDomain()).isPresent()) {
            throw new RuntimeException("Subdomain already exists");
        }
        if (userRepository.findByUsername(request.getAdminUsername()).isPresent()) {
            throw new RuntimeException("Username already taken. Please choose another.");
        }
        if (userRepository.findByEmailIgnoreCase(request.getAdminEmail()).isPresent()) {
            throw new RuntimeException("Email already registered. Please login or use another.");
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
            adminUser.setEmail(request.getAdminEmail());
            // VALIDATE AND HASH THE PASSWORD
            validatePassword(request.getAdminPassword());

            String rawPassword = request.getAdminPassword();
            String encodedPassword = passwordEncoder.encode(rawPassword);
            System.out.println("DEBUG: Raw Password: " + rawPassword);
            System.out.println("DEBUG: Encoded Password: " + encodedPassword);

            adminUser.setPasswordHash(encodedPassword);
            adminUser.setRole("ESTATE_ADMIN");

            System.out.println(
                    "DEBUG: Saving Admin User: " + adminUser.getUsername() + " with email: " + adminUser.getEmail());
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

        // 1. Find User (by Username OR Email)
        String loginInput = request.getUsername(); // The logic accepts either in this field
        User user;

        if (loginInput.contains("@")) {
            // Attempt login by EMAIL
            user = userRepository.findByEmailIgnoreCase(loginInput)
                    .orElseThrow(() -> new RuntimeException("Invalid credentials"));
        } else {
            // Attempt login by USERNAME
            user = userRepository.findByUsername(loginInput)
                    .orElseThrow(() -> new RuntimeException("Invalid credentials"));
        }

        // 2. Verify Password using BCrypt
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
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
                tenant.getSubDomain(),
                user.getDivisionAccess()); // Pass the list of Division IDs
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
        // VALIDATE AND HASH THE PASSWORD
        validatePassword(request.getPassword());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        if (request.getDivisionAccess() != null && !request.getDivisionAccess().isEmpty()) {
            java.util.Set<com.knoweb.tenant.entity.Division> divisions = new java.util.HashSet<>();
            for (String divIdStr : request.getDivisionAccess()) {
                try {
                    java.util.UUID divId = java.util.UUID.fromString(divIdStr);
                    divisionRepository.findById(divId).ifPresent(divisions::add);
                } catch (IllegalArgumentException e) {
                    // Ignore invalid IDs
                }
            }
            user.setDivisions(divisions);
        }

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
        if (request.getDivisionAccess() != null) {
            java.util.Set<com.knoweb.tenant.entity.Division> divisions = new java.util.HashSet<>();
            for (String divIdStr : request.getDivisionAccess()) {
                try {
                    java.util.UUID divId = java.util.UUID.fromString(divIdStr);
                    divisionRepository.findById(divId).ifPresent(divisions::add);
                } catch (IllegalArgumentException e) {
                    // Ignore
                }
            }
            user.setDivisions(divisions);
        }

        // Update password only if provided and not empty
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            // VALIDATE AND HASH THE PASSWORD
            validatePassword(request.getPassword());
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(java.util.UUID userId) {
        userRepository.deleteById(userId);
    }

    @Transactional
    public String forgotPassword(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        // Generate Token
        String token = java.util.UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1)); // 1 Hour Validity

        userRepository.save(user);

        // In a real app, send email here. For now, return token for testing/demo
        System.out.println("DEBUG: Reset Token for " + email + ": " + token);
        return token;
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Token expired");
        }

        validatePassword(newPassword);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);

        userRepository.save(user);
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new RuntimeException("Password must be at least 8 characters long.");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new RuntimeException("Password must contain at least one uppercase letter.");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new RuntimeException("Password must contain at least one lowercase letter.");
        }
        if (!password.matches(".*\\d.*")) {
            throw new RuntimeException("Password must contain at least one number.");
        }
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            throw new RuntimeException("Password must contain at least one special character.");
        }
    }
}
