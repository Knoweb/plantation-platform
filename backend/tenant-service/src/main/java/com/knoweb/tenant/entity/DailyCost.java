package com.knoweb.tenant.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class DailyCost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tenantId;
    private String cropType;
    private LocalDate date;

    @Column(columnDefinition = "TEXT")
    private String costData;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getCropType() {
        return cropType;
    }

    public void setCropType(String cropType) {
        this.cropType = cropType;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getCostData() {
        return costData;
    }

    public void setCostData(String costData) {
        this.costData = costData;
    }
}
