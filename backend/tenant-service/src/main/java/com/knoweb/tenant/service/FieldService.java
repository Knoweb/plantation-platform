package com.knoweb.tenant.service;

import com.knoweb.tenant.entity.Field;
import com.knoweb.tenant.repository.FieldRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class FieldService {

    private final FieldRepository fieldRepository;

    public FieldService(FieldRepository fieldRepository) {
        this.fieldRepository = fieldRepository;
    }

    public Field createField(UUID tenantId, UUID divisionId, String name, Double acreage, String cropType, Integer spa, Integer bushCount) {
        Field field = new Field(tenantId, divisionId, name, acreage, cropType);
        if (spa != null) field.setSpa(spa);
        if (bushCount != null) field.setBushCount(bushCount);
        return fieldRepository.save(field);
    }

    public List<Field> getFieldsByDivision(UUID divisionId) {
        return fieldRepository.findByDivisionId(divisionId);
    }
    
    public List<Field> getFieldsByDivisionIds(List<UUID> divisionIds) {
        return fieldRepository.findByDivisionIdIn(divisionIds);
    }

    public List<Field> getFieldsByTenant(UUID tenantId) {
        return fieldRepository.findByTenantId(tenantId);
    }

    public void deleteField(UUID fieldId) {
        fieldRepository.deleteById(fieldId);
    }

    public Field updateField(UUID fieldId, Field updatedData) {
        return fieldRepository.findById(fieldId).map(field -> {
            if (updatedData.getName() != null) field.setName(updatedData.getName());
            if (updatedData.getAcreage() != null) field.setAcreage(updatedData.getAcreage());
            if (updatedData.getCropType() != null) field.setCropType(updatedData.getCropType());
            if (updatedData.getSpa() != null) field.setSpa(updatedData.getSpa());
            if (updatedData.getBushCount() != null) field.setBushCount(updatedData.getBushCount());
            if (updatedData.getPlantedDate() != null) field.setPlantedDate(updatedData.getPlantedDate());
            if (updatedData.getDivisionId() != null) field.setDivisionId(updatedData.getDivisionId());
            return fieldRepository.save(field);
        }).orElseThrow(() -> new RuntimeException("Field not found with id " + fieldId));
    }
}
