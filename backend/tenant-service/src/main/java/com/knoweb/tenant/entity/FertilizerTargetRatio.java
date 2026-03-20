package com.knoweb.tenant.entity;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(
        name = "fertilizer_target_ratio",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = { "tenant_id", "division_id", "crop_type", "field_id", "plan_month" })
        }
)
public class FertilizerTargetRatio {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "division_id", nullable = false)
    private UUID divisionId;

    @Column(name = "crop_type", nullable = false, length = 50)
    private String cropType;

    @Column(name = "field_id", nullable = false)
    private UUID fieldId;

    // YYYY-MM
    @Column(name = "plan_month", nullable = false, length = 7)
    private String planMonth;

    // percent value, e.g. 12.0
    @Column(name = "target_ratio_percent", nullable = false)
    private Double targetRatioPercent;

    @Column(name = "crop_12m")
    private Double crop12m;

    public FertilizerTargetRatio() {}

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

    public String getCropType() {
        return cropType;
    }

    public void setCropType(String cropType) {
        this.cropType = cropType;
    }

    public UUID getFieldId() {
        return fieldId;
    }

    public void setFieldId(UUID fieldId) {
        this.fieldId = fieldId;
    }

    public String getPlanMonth() {
        return planMonth;
    }

    public void setPlanMonth(String planMonth) {
        this.planMonth = planMonth;
    }

    public Double getTargetRatioPercent() {
        return targetRatioPercent;
    }

    public void setTargetRatioPercent(Double targetRatioPercent) {
        this.targetRatioPercent = targetRatioPercent;
    }

    public Double getCrop12m() {
        return crop12m;
    }

    public void setCrop12m(Double crop12m) {
        this.crop12m = crop12m;
    }
}

