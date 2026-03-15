package com.knoweb.tenant.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "work_program", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "year", "month", "task_name"})
})
public class WorkProgram {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(name = "year", nullable = false)
    private int year;

    @Column(name = "month", nullable = false)
    private int month;

    @Column(name = "task_name", nullable = false)
    private String taskName;

    @Column(name = "workers_needed")
    private int workersNeeded;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public String getTaskName() { return taskName; }
    public void setTaskName(String taskName) { this.taskName = taskName; }

    public int getWorkersNeeded() { return workersNeeded; }
    public void setWorkersNeeded(int workersNeeded) { this.workersNeeded = workersNeeded; }
}
