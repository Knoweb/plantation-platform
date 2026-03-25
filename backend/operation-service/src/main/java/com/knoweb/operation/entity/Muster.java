package com.knoweb.operation.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Data
@Table(name = "musters")
public class Muster {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;
    private String tenantId;
    private String divisionId; // For filtering by division

    public String getDivisionId() {
        return divisionId;
    }

    public void setDivisionId(String divisionId) {
        this.divisionId = divisionId;
    }
    private String fieldName;
    private String taskType;
    private Integer workerCount;
    private String status; // PENDING, APPROVED
    private String aiAdvisory; // AI-suggested optimizations

    public String getAiAdvisory() {
        return aiAdvisory;
    }

    public void setAiAdvisory(String aiAdvisory) {
        this.aiAdvisory = aiAdvisory;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getFieldName() {
        return fieldName;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public String getTaskType() {
        return taskType;
    }

    public void setTaskType(String taskType) {
        this.taskType = taskType;
    }

    public Integer getWorkerCount() {
        return workerCount;
    }

    public void setWorkerCount(Integer workerCount) {
        this.workerCount = workerCount;
    }

    @ElementCollection
    private java.util.List<String> workerIds; // IDs of workers assigned to this muster

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public java.util.List<String> getWorkerIds() {
        return workerIds;
    }

    public void setWorkerIds(java.util.List<String> workerIds) {
        this.workerIds = workerIds;
    }
}
