package com.knoweb.operation.messaging;

import java.io.Serializable;

public class HarvestLoggedEvent implements Serializable {

    private Long harvestLogId;
    private String tenantId;
    private String divisionId;
    private String workerName;
    private String fieldName;
    private Double quantityKg;
    private String cropType;
    private String date; // LocalDate as String (ISO format)

    public HarvestLoggedEvent() {}

    public HarvestLoggedEvent(Long harvestLogId, String tenantId, String divisionId,
                              String workerName, String fieldName,
                              Double quantityKg, String cropType, String date) {
        this.harvestLogId = harvestLogId;
        this.tenantId = tenantId;
        this.divisionId = divisionId;
        this.workerName = workerName;
        this.fieldName = fieldName;
        this.quantityKg = quantityKg;
        this.cropType = cropType;
        this.date = date;
    }

    public Long getHarvestLogId() { return harvestLogId; }
    public void setHarvestLogId(Long harvestLogId) { this.harvestLogId = harvestLogId; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public String getDivisionId() { return divisionId; }
    public void setDivisionId(String divisionId) { this.divisionId = divisionId; }

    public String getWorkerName() { return workerName; }
    public void setWorkerName(String workerName) { this.workerName = workerName; }

    public String getFieldName() { return fieldName; }
    public void setFieldName(String fieldName) { this.fieldName = fieldName; }

    public Double getQuantityKg() { return quantityKg; }
    public void setQuantityKg(Double quantityKg) { this.quantityKg = quantityKg; }

    public String getCropType() { return cropType; }
    public void setCropType(String cropType) { this.cropType = cropType; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
}
