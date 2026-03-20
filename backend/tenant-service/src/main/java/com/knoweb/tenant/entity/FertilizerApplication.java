package com.knoweb.tenant.entity;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(
        name = "fertilizer_applications",
        indexes = {
                @Index(name = "idx_fert_app_tenant_div_year_month", columnList = "tenant_id,division_id,year,month"),
                @Index(name = "idx_fert_app_tenant_field_year_month", columnList = "tenant_id,field_id,year,month")
        }
)
public class FertilizerApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "division_id", nullable = false)
    private UUID divisionId;

    @Column(name = "field_id", nullable = false)
    private UUID fieldId;

    @Column(name = "year", nullable = false)
    private Integer year;

    // 1..12
    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "fertilizer_id", nullable = false)
    private UUID fertilizerId;

    @Column(name = "qty_kg", nullable = false)
    private Double qtyKg;

    public FertilizerApplication() {}

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

    public UUID getDivisionId() {
        return divisionId;
    }

    public void setDivisionId(UUID divisionId) {
        this.divisionId = divisionId;
    }

    public UUID getFieldId() {
        return fieldId;
    }

    public void setFieldId(UUID fieldId) {
        this.fieldId = fieldId;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public UUID getFertilizerId() {
        return fertilizerId;
    }

    public void setFertilizerId(UUID fertilizerId) {
        this.fertilizerId = fertilizerId;
    }

    public Double getQtyKg() {
        return qtyKg;
    }

    public void setQtyKg(Double qtyKg) {
        this.qtyKg = qtyKg;
    }
}

