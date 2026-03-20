package com.knoweb.operation.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "task_types")
public class TaskType {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "expected_unit")
    private String expectedUnit;

    @Column(name = "crop_type")
    private String cropType; // e.g. TEA, RUBBER, CINNAMON, GENERAL

    public TaskType() {
    }

    public TaskType(UUID tenantId, String name, String expectedUnit) {
        this.tenantId = tenantId;
        this.name = name;
        this.expectedUnit = expectedUnit;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Boolean getActive() {
        return isActive;
    }

    public void setActive(Boolean active) {
        isActive = active;
    }

    public String getExpectedUnit() {
        return expectedUnit;
    }

    public void setExpectedUnit(String expectedUnit) {
        this.expectedUnit = expectedUnit;
    }

    public String getCropType() {
        return cropType;
    }

    public void setCropType(String cropType) {
        this.cropType = cropType;
    }
}
