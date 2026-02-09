package com.knoweb.tenant.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "attendance")
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "worker_id", nullable = false)
    private String workerId; // Matches Worker.workerId (String) or Use UUID if Worker uses UUID key?
    // Worker entity key is String workerId? Let me check Worker.java. Assuming String based on MorningMuster use of workerId.

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "work_type")
    private String workType; // e.g., "Plucking"

    @Column(name = "field_name")
    private String fieldName;

    @Column(name = "daily_work_id")
    private UUID dailyWorkId; // Link to the aggregated muster

    // New Fields for Evening Muster (Harvest Data)
    @Column(name = "am_weight")
    private Double amWeight;

    @Column(name = "pm_weight")
    private Double pmWeight;

    @Column(name = "status")
    private String status = "PRESENT"; // PRESENT, ABSENT, HALF_DAY

    // Constructors
    public Attendance() {}

    public Attendance(UUID tenantId, String workerId, LocalDate workDate, String workType, String fieldName, UUID dailyWorkId) {
        this.tenantId = tenantId;
        this.workerId = workerId;
        this.workDate = workDate;
        this.workType = workType;
        this.fieldName = fieldName;
        this.dailyWorkId = dailyWorkId;
        this.status = "PRESENT"; // Default
    }

    // Getters and Setters
    public Double getAmWeight() { return amWeight; }
    public void setAmWeight(Double amWeight) { this.amWeight = amWeight; }

    public Double getPmWeight() { return pmWeight; }
    public void setPmWeight(Double pmWeight) { this.pmWeight = pmWeight; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public String getWorkerId() { return workerId; }
    public void setWorkerId(String workerId) { this.workerId = workerId; }

    public LocalDate getWorkDate() { return workDate; }
    public void setWorkDate(LocalDate workDate) { this.workDate = workDate; }

    public String getWorkType() { return workType; }
    public void setWorkType(String workType) { this.workType = workType; }

    public String getFieldName() { return fieldName; }
    public void setFieldName(String fieldName) { this.fieldName = fieldName; }

    public UUID getDailyWorkId() { return dailyWorkId; }
    public void setDailyWorkId(UUID dailyWorkId) { this.dailyWorkId = dailyWorkId; }
}
