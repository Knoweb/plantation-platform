package com.knoweb.inventory.messaging;

import java.io.Serializable;

/**
 * Mirror of operation-service's HarvestLoggedEvent.
 * In microservices, each service owns its own copy of shared DTOs.
 * Serialization/deserialization is handled via JSON.
 */
public class HarvestLoggedEvent implements Serializable {

    private Long harvestLogId;
    private String tenantId;
    private String divisionId;
    private String workerName;
    private String fieldName;
    private Double quantityKg;
    private String cropType;
    private String date;

    public HarvestLoggedEvent() {}

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
