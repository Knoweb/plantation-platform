package com.knoweb.tenant.dto;

import java.util.Map;

public class TenantRequest {
    private String companyName;
    private String subDomain;
    private String logoUrl;
    private String adminUsername;
    private String adminEmail;
    private String adminPassword;
    private Map<String, Object> configJson;
    private java.util.List<DivisionPayload> divisions;

    public static class DivisionPayload {
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    // Getters and Setters
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

    public String getAdminUsername() {
        return adminUsername;
    }

    public void setAdminUsername(String adminUsername) {
        this.adminUsername = adminUsername;
    }

    public String getAdminPassword() {
        return adminPassword;
    }

    public void setAdminPassword(String adminPassword) {
        this.adminPassword = adminPassword;
    }

    public String getAdminEmail() {
        return adminEmail;
    }

    public void setAdminEmail(String adminEmail) {
        this.adminEmail = adminEmail;
    }

    public Map<String, Object> getConfigJson() {
        return configJson;
    }

    public void setConfigJson(Map<String, Object> configJson) {
        this.configJson = configJson;
    }

    public java.util.List<DivisionPayload> getDivisions() {
        return divisions;
    }

    public void setDivisions(java.util.List<DivisionPayload> divisions) {
        this.divisions = divisions;
    }
}
