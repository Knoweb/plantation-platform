package com.knoweb.operation.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "leave_quotas")
public class LeaveQuota {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "duty_leave", nullable = false)
    private int dutyLeave = 0;

    @Column(name = "annual_leave", nullable = false)
    private int annualLeave = 0;

    @Column(name = "casual_leave", nullable = false)
    private int casualLeave = 0;

    public LeaveQuota() {}

    public LeaveQuota(UUID tenantId, UUID userId, int dutyLeave, int annualLeave, int casualLeave) {
        this.tenantId = tenantId;
        this.userId = userId;
        this.dutyLeave = dutyLeave;
        this.annualLeave = annualLeave;
        this.casualLeave = casualLeave;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public int getDutyLeave() { return dutyLeave; }
    public void setDutyLeave(int dutyLeave) { this.dutyLeave = dutyLeave; }
    public int getAnnualLeave() { return annualLeave; }
    public void setAnnualLeave(int annualLeave) { this.annualLeave = annualLeave; }
    public int getCasualLeave() { return casualLeave; }
    public void setCasualLeave(int casualLeave) { this.casualLeave = casualLeave; }
}
