package com.knoweb.tenant.controller;

import com.knoweb.tenant.dto.AuthRequest;
import com.knoweb.tenant.dto.TenantRequest;
import com.knoweb.tenant.dto.UserRequest;
import com.knoweb.tenant.service.TenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/tenants")
public class TenantController {

    private final TenantService tenantService;

    public TenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @PostMapping
    public ResponseEntity<?> createTenant(@RequestBody TenantRequest request) {
        try {
            return ResponseEntity.ok(tenantService.createTenant(request));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllTenants() {
        return ResponseEntity.ok(tenantService.getAllTenants());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTenant(@PathVariable java.util.UUID id) {
        tenantService.deleteTenant(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable java.util.UUID id, @RequestParam String status) {
        return ResponseEntity.ok(tenantService.updateTenantStatus(id, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTenantById(@PathVariable java.util.UUID id) {
        return ResponseEntity.ok(tenantService.getTenantById(id));
    }

    @GetMapping("/{id}/users")
    public ResponseEntity<?> getTenantUsers(@PathVariable java.util.UUID id) {
        return ResponseEntity.ok(tenantService.getTenantUsers(id));
    }
    
    @GetMapping("/{id}/field-officers")
    public ResponseEntity<?> getFieldOfficers(@PathVariable java.util.UUID id, @RequestParam String divisionIds) {
        try {
            java.util.List<java.util.UUID> ids = java.util.Arrays.stream(divisionIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(java.util.UUID::fromString)
                .collect(java.util.stream.Collectors.toList());
            return ResponseEntity.ok(tenantService.getFieldOfficers(id, ids));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid UUID list format"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            return ResponseEntity.ok(tenantService.login(request));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody UserRequest request) {
        try {
            return ResponseEntity.ok(tenantService.createUser(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable java.util.UUID userId, @RequestBody UserRequest request) {
        try {
            return ResponseEntity.ok(tenantService.updateUser(userId, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUserById(@PathVariable java.util.UUID userId) {
        return ResponseEntity.ok(tenantService.getUserById(userId));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable java.util.UUID userId) {
        tenantService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            String token = tenantService.forgotPassword(request.get("email"));
            return ResponseEntity.ok(Map.of("message", "Reset token generated", "token", token));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        try {
            tenantService.resetPassword(request.get("token"), request.get("newPassword"));
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/config")
    public ResponseEntity<?> updateConfig(@PathVariable java.util.UUID id, @RequestBody java.util.Map<String, Object> configJson) {
        try {
            return ResponseEntity.ok(tenantService.updateTenantConfig(id, configJson));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/details")
    public ResponseEntity<?> updateDetails(@PathVariable java.util.UUID id, @RequestBody java.util.Map<String, String> request) {
        try {
            return ResponseEntity.ok(tenantService.updateTenantDetails(id, request.get("companyName"), request.get("logoUrl")));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }
}
