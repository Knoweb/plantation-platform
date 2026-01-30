package com.knoweb.tenant.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tenants")
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "company_name", nullable = false, length = 100)
    private String companyName;

    @Column(name = "sub_domain", nullable = false, length = 50, unique = true)
    private String subDomain;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "subscription_status", length = 20)
    @ColumnDefault("'ACTIVE'")
    private String subscriptionStatus;

    @Column(name = "config_json", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> configJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.subscriptionStatus == null) {
            this.subscriptionStatus = "ACTIVE";
        }
    }

    public Tenant() {
    }

    public Tenant(String companyName, String subDomain, String logoUrl, String subscriptionStatus,
            Map<String, Object> configJson, LocalDateTime createdAt) {
        this.companyName = companyName;
        this.subDomain = subDomain;
        this.logoUrl = logoUrl;
        this.subscriptionStatus = subscriptionStatus;
        this.configJson = configJson;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getSubDomain() {
        return subDomain;
    }

    public void setSubDomain(String subDomain) {
        this.subDomain = subDomain;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getSubscriptionStatus() {
        return subscriptionStatus;
    }

    public void setSubscriptionStatus(String subscriptionStatus) {
        this.subscriptionStatus = subscriptionStatus;
    }

    public Map<String, Object> getConfigJson() {
        return configJson;
    }

    public void setConfigJson(Map<String, Object> configJson) {
        this.configJson = configJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
