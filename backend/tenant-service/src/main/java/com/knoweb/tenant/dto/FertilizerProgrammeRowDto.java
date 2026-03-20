package com.knoweb.tenant.dto;

import java.util.Map;
import java.util.UUID;

public class FertilizerProgrammeRowDto {
    public UUID id;
    public UUID tenantId;
    public UUID divisionId;
    public String cropType;
    public UUID fieldId;
    public String fieldName;
    public Double extentAc;
    public Integer bushCount;
    public Integer spa;

    public String planMonth;

    public Double cropLast12MonthsKg;
    public Double nitrogenKg;
    public Double ratio;
    public Double requirementKg;

    public Map<String, Double> history; // yyyy-MM -> kg applied
}

