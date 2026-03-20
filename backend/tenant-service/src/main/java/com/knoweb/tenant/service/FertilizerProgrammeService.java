package com.knoweb.tenant.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knoweb.tenant.dto.FertilizerProgrammeRowDto;
import com.knoweb.tenant.entity.Field;
import com.knoweb.tenant.entity.FertilizerProgrammeRow;
import com.knoweb.tenant.repository.FieldRepository;
import com.knoweb.tenant.repository.FertilizerProgrammeRowRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class FertilizerProgrammeService {

    private final FertilizerProgrammeRowRepository rowRepository;
    private final FieldRepository fieldRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Temporary default until you add per-crop configuration.
    private static final double DEFAULT_REQUIREMENT_FACTOR = 1.1;

    public FertilizerProgrammeService(FertilizerProgrammeRowRepository rowRepository, FieldRepository fieldRepository) {
        this.rowRepository = rowRepository;
        this.fieldRepository = fieldRepository;
    }

    private Map<String, Double> parseHistory(String historyJson) {
        if (historyJson == null || historyJson.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(historyJson, new TypeReference<Map<String, Double>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private String writeHistory(Map<String, Double> history) {
        if (history == null) return "{}";
        try {
            return objectMapper.writeValueAsString(history);
        } catch (Exception e) {
            return "{}";
        }
    }

    private double safeDouble(Double v) {
        return v == null ? 0.0 : v;
    }

    private Double computeRatio(Double cropLast12, Double nitrogen) {
        if (cropLast12 == null || nitrogen == null) return null;
        if (nitrogen <= 0) return null;
        return cropLast12 / nitrogen;
    }

    private Double computeRequirement(Double nitrogen) {
        if (nitrogen == null) return null;
        return nitrogen * DEFAULT_REQUIREMENT_FACTOR;
    }

    public List<FertilizerProgrammeRowDto> getProgramme(UUID tenantId, UUID divisionId, String cropType, String planMonth) {
        List<Field> fields = fieldRepository.findByDivisionId(divisionId);
        if (cropType != null && !cropType.equalsIgnoreCase("ALL")) {
            fields = fields.stream()
                    .filter(f -> f.getCropType() != null && f.getCropType().trim().equalsIgnoreCase(cropType))
                    .collect(Collectors.toList());
        }

        Map<UUID, FertilizerProgrammeRow> existing = rowRepository
                .findByTenantIdAndDivisionIdAndPlanMonth(tenantId, divisionId, planMonth)
                .stream()
                .filter(r -> cropType == null || cropType.equalsIgnoreCase("ALL") || r.getCropType().equalsIgnoreCase(cropType))
                .collect(Collectors.toMap(FertilizerProgrammeRow::getFieldId, r -> r, (a, b) -> a));

        List<FertilizerProgrammeRowDto> out = new ArrayList<>();
        for (Field field : fields) {
            FertilizerProgrammeRow row = existing.get(field.getFieldId());
            if (row == null) {
                row = new FertilizerProgrammeRow();
                row.setTenantId(tenantId);
                row.setDivisionId(divisionId);
                row.setCropType(field.getCropType() == null ? (cropType == null ? "TEA" : cropType) : field.getCropType().toUpperCase());
                row.setFieldId(field.getFieldId());
                row.setPlanMonth(planMonth);
            }

            FertilizerProgrammeRowDto dto = new FertilizerProgrammeRowDto();
            dto.id = row.getId();
            dto.tenantId = row.getTenantId();
            dto.divisionId = row.getDivisionId();
            dto.cropType = row.getCropType();
            dto.fieldId = row.getFieldId();
            dto.fieldName = field.getName();
            dto.extentAc = field.getAcreage();
            dto.spa = field.getSpa();
            dto.bushCount = field.getBushCount();

            // If only SPA is known, derive bush count. If only bush count is known, derive SPA.
            if (dto.bushCount == null && dto.spa != null && dto.extentAc != null) {
                dto.bushCount = (int) Math.round(dto.spa * dto.extentAc);
            }
            if (dto.spa == null && dto.bushCount != null && dto.extentAc != null && dto.extentAc > 0) {
                dto.spa = (int) Math.round(dto.bushCount / dto.extentAc);
            }

            dto.planMonth = row.getPlanMonth();
            dto.cropLast12MonthsKg = row.getCropLast12MonthsKg();
            dto.nitrogenKg = row.getNitrogenKg();
            dto.ratio = row.getRatio() != null ? row.getRatio() : computeRatio(row.getCropLast12MonthsKg(), row.getNitrogenKg());
            dto.requirementKg = row.getRequirementKg() != null ? row.getRequirementKg() : computeRequirement(row.getNitrogenKg());
            dto.history = parseHistory(row.getHistoryJson());
            out.add(dto);
        }
        return out;
    }

    public FertilizerProgrammeRowDto upsertProgrammeRow(FertilizerProgrammeRowDto input) {
        if (input.tenantId == null || input.divisionId == null || input.fieldId == null || input.planMonth == null) {
            throw new IllegalArgumentException("tenantId, divisionId, fieldId and planMonth are required");
        }
        String cropType = (input.cropType == null || input.cropType.isBlank()) ? "TEA" : input.cropType.toUpperCase();

        FertilizerProgrammeRow row = rowRepository
                .findByTenantIdAndDivisionIdAndCropTypeAndFieldIdAndPlanMonth(input.tenantId, input.divisionId, cropType, input.fieldId, input.planMonth)
                .orElseGet(() -> {
                    FertilizerProgrammeRow created = new FertilizerProgrammeRow();
                    created.setTenantId(input.tenantId);
                    created.setDivisionId(input.divisionId);
                    created.setCropType(cropType);
                    created.setFieldId(input.fieldId);
                    created.setPlanMonth(input.planMonth);
                    return created;
                });

        row.setCropLast12MonthsKg(input.cropLast12MonthsKg);
        row.setNitrogenKg(input.nitrogenKg);
        row.setRatio(computeRatio(input.cropLast12MonthsKg, input.nitrogenKg));
        row.setRequirementKg(input.requirementKg != null ? input.requirementKg : computeRequirement(input.nitrogenKg));
        row.setHistoryJson(writeHistory(input.history));

        FertilizerProgrammeRow saved = rowRepository.save(row);

        // return enriched dto
        Field field = fieldRepository.findById(saved.getFieldId()).orElse(null);
        FertilizerProgrammeRowDto dto = new FertilizerProgrammeRowDto();
        dto.id = saved.getId();
        dto.tenantId = saved.getTenantId();
        dto.divisionId = saved.getDivisionId();
        dto.cropType = saved.getCropType();
        dto.fieldId = saved.getFieldId();
        dto.fieldName = field != null ? field.getName() : null;
        dto.extentAc = field != null ? field.getAcreage() : null;
        dto.spa = field != null ? field.getSpa() : null;
        dto.bushCount = field != null ? field.getBushCount() : null;
        dto.planMonth = saved.getPlanMonth();
        dto.cropLast12MonthsKg = saved.getCropLast12MonthsKg();
        dto.nitrogenKg = saved.getNitrogenKg();
        dto.ratio = saved.getRatio();
        dto.requirementKg = saved.getRequirementKg();
        dto.history = parseHistory(saved.getHistoryJson());
        return dto;
    }

    public List<FertilizerProgrammeRowDto> upsertProgrammeRows(List<FertilizerProgrammeRowDto> rows) {
        if (rows == null) return List.of();
        List<FertilizerProgrammeRowDto> out = new ArrayList<>();
        for (FertilizerProgrammeRowDto row : rows) {
            out.add(upsertProgrammeRow(row));
        }
        return out;
    }
}

