package com.knoweb.tenant.dto;

import java.util.UUID;

public class AuthResponse {
    private UUID userId;
    private String username;
    private String fullName;
    private String role;

    // Tenant Details
    private UUID tenantId;
    private String companyName;
    private String logoUrl;
    private String subDomain;

    public AuthResponse(UUID userId, String username, String fullName, String role,
            UUID tenantId, String companyName, String logoUrl, String subDomain) {
        this.userId = userId;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
        this.tenantId = tenantId;
        this.companyName = companyName;
        this.logoUrl = logoUrl;
        this.subDomain = subDomain;
    }

    // Getters
    public UUID getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getFullName() {
        return fullName;
    }

    public String getRole() {
        return role;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public String getSubDomain() {
        return subDomain;
    }
}
