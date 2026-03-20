package com.knoweb.tenant.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "fields", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "division_id", "name" })
})
public class Field {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "field_id")
    private UUID fieldId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "division_id", nullable = false)
    private UUID divisionId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "acreage")
    private Double acreage;

    @Column(name = "crop_type", length = 50)
    private String cropType; // Tea, Rubber, etc.

    @Column(name = "spa")
    private Integer spa; // standard plants per acre / planting density

    @Column(name = "bush_count")
    private Integer bushCount; // total bushes in this field

    @Column(name = "planted_date")
    private java.time.LocalDate plantedDate;

    public Field() {
    }

    public Field(UUID tenantId, UUID divisionId, String name, Double acreage, String cropType) {
        this.tenantId = tenantId;
        this.divisionId = divisionId;
        this.name = name;
        this.acreage = acreage;
        this.cropType = cropType;
    }

    // Getters and Setters
    public UUID getFieldId() {
        return fieldId;
    }

    public void setFieldId(UUID fieldId) {
        this.fieldId = fieldId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public UUID getDivisionId() {
        return divisionId;
    }

    public void setDivisionId(UUID divisionId) {
        this.divisionId = divisionId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getAcreage() {
        return acreage;
    }

    public void setAcreage(Double acreage) {
        this.acreage = acreage;
    }

    public String getCropType() {
        return cropType;
    }

    public void setCropType(String cropType) {
        this.cropType = cropType;
    }

    public Integer getSpa() {
        return spa;
    }

    public void setSpa(Integer spa) {
        this.spa = spa;
    }

    public Integer getBushCount() {
        return bushCount;
    }

    public void setBushCount(Integer bushCount) {
        this.bushCount = bushCount;
    }

    public java.time.LocalDate getPlantedDate() {
        return plantedDate;
    }

    public void setPlantedDate(java.time.LocalDate plantedDate) {
        this.plantedDate = plantedDate;
    }
}
