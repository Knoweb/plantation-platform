package com.knoweb.tenant.entity;

import com.knoweb.tenant.enums.JobRole;
import com.knoweb.tenant.enums.WorkerGender;
import com.knoweb.tenant.enums.WorkerStatus;
import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "workers")
public class Worker {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "worker_id")
    private UUID id;

    @Column(name = "registration_number", nullable = false)
    private String registrationNumber;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false)
    private WorkerGender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_role", nullable = false)
    private JobRole jobRole;

    @Column(name = "epf_number")
    private String epfNumber;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private WorkerStatus status;

    @ElementCollection
    @CollectionTable(name = "worker_divisions", joinColumns = @JoinColumn(name = "worker_id"))
    @Column(name = "division_id")
    private Set<String> divisionIds = new HashSet<>();

    public Worker() {
    }

    public Worker(String registrationNumber, String name, WorkerGender gender, JobRole jobRole, String epfNumber,
            String tenantId, WorkerStatus status) {
        this.registrationNumber = registrationNumber;
        this.name = name;
        this.gender = gender;
        this.jobRole = jobRole;
        this.epfNumber = epfNumber;
        this.tenantId = tenantId;
        this.status = status;
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public WorkerGender getGender() {
        return gender;
    }

    public void setGender(WorkerGender gender) {
        this.gender = gender;
    }

    public JobRole getJobRole() {
        return jobRole;
    }

    public void setJobRole(JobRole jobRole) {
        this.jobRole = jobRole;
    }

    public String getEpfNumber() {
        return epfNumber;
    }

    public void setEpfNumber(String epfNumber) {
        this.epfNumber = epfNumber;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public WorkerStatus getStatus() {
        return status;
    }

    public void setStatus(WorkerStatus status) {
        this.status = status;
    }

    public Set<String> getDivisionIds() {
        return divisionIds;
    }

    public void setDivisionIds(Set<String> divisionIds) {
        this.divisionIds = divisionIds;
    }
}
