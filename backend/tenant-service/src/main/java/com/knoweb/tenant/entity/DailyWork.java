package com.knoweb.tenant.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "daily_work")
public class DailyWork {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "work_id")
    private UUID workId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "division_id", nullable = false)
    private String divisionId; // Linking to Division ID (String/UUID depending on Division Entity)

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "work_type", nullable = false) // HARVEST, MAINTENANCE
    private String workType;

    @Column(name = "details_v2", columnDefinition = "TEXT") // Version 2 for larger JSON payload
    private String details;

    @Column(name = "quantity")
    private Double quantity; // kg or acres

    @Column(name = "worker_count")
    private Integer workerCount;

    @Column(name = "status") // PENDING, APPROVED
    private String status = "PENDING";

    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt;

    // Constructors
    public DailyWork() {
    }

    // Getters and Setters
    public UUID getWorkId() {
        return workId;
    }

    public void setWorkId(UUID workId) {
        this.workId = workId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public String getDivisionId() {
        return divisionId;
    }

    public void setDivisionId(String divisionId) {
        this.divisionId = divisionId;
    }

    public LocalDate getWorkDate() {
        return workDate;
    }

    public void setWorkDate(LocalDate workDate) {
        this.workDate = workDate;
    }

    public String getWorkType() {
        return workType;
    }

    public void setWorkType(String workType) {
        this.workType = workType;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public Double getQuantity() {
        return quantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
    }

    public Integer getWorkerCount() {
        return workerCount;
    }

    public void setWorkerCount(Integer workerCount) {
        this.workerCount = workerCount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public java.time.LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(java.time.LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Column(name = "action_at")
    private java.time.LocalDateTime actionAt;

    public java.time.LocalDateTime getActionAt() {
        return actionAt;
    }

    public void setActionAt(java.time.LocalDateTime actionAt) {
        this.actionAt = actionAt;
    }
}
