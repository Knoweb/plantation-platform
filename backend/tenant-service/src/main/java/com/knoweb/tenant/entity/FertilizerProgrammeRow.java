package com.knoweb.tenant.entity;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(
        name = "fertilizer_programme_rows",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = { "tenant_id", "division_id", "crop_type", "field_id", "plan_month" })
        }
)
public class FertilizerProgrammeRow {

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

    // YYYY-MM (e.g. 2026-07) representing the "Requirement" month shown on the sheet.
    @Column(name = "plan_month", nullable = false, length = 7)
    private String planMonth;

    // Previous 12 months inputs
    @Column(name = "crop_last_12_months_kg")
    private Double cropLast12MonthsKg;

    @Column(name = "nitrogen_kg")
    private Double nitrogenKg;

    // Stored for convenience but can be derived: cropLast12MonthsKg / nitrogenKg
    @Column(name = "ratio")
    private Double ratio;

    // Requirement for planMonth (Kg)
    @Column(name = "requirement_kg")
    private Double requirementKg;

    // History of applied fertilizer: JSON string map {"2026-04": 123.0, "2026-05": 0, ...}
    @Column(name = "history_json", columnDefinition = "text")
    private String historyJson;

    public FertilizerProgrammeRow() {}

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

    public Double getCropLast12MonthsKg() {
        return cropLast12MonthsKg;
    }

    public void setCropLast12MonthsKg(Double cropLast12MonthsKg) {
        this.cropLast12MonthsKg = cropLast12MonthsKg;
    }

    public Double getNitrogenKg() {
        return nitrogenKg;
    }

    public void setNitrogenKg(Double nitrogenKg) {
        this.nitrogenKg = nitrogenKg;
    }

    public Double getRatio() {
        return ratio;
    }

    public void setRatio(Double ratio) {
        this.ratio = ratio;
    }

    public Double getRequirementKg() {
        return requirementKg;
    }

    public void setRequirementKg(Double requirementKg) {
        this.requirementKg = requirementKg;
    }

    public String getHistoryJson() {
        return historyJson;
    }

    public void setHistoryJson(String historyJson) {
        this.historyJson = historyJson;
    }
}

