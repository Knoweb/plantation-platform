package com.knoweb.operation.dto;

public class ReviewRequest {
    private String details;
    private Integer workerCount;
    private String remarks;

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public Integer getWorkerCount() {
        return workerCount;
    }

    public void setWorkerCount(Integer workerCount) {
        this.workerCount = workerCount;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
}
