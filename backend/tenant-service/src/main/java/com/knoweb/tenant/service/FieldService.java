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

    public Field createField(UUID tenantId, UUID divisionId, String name, Double acreage, String cropType) {
        Field field = new Field(tenantId, divisionId, name, acreage, cropType);
        return fieldRepository.save(field);
    }

    public List<Field> getFieldsByDivision(UUID divisionId) {
        return fieldRepository.findByDivisionId(divisionId);
    }

    public List<Field> getFieldsByTenant(UUID tenantId) {
        return fieldRepository.findByTenantId(tenantId);
    }

    public void deleteField(UUID fieldId) {
        fieldRepository.deleteById(fieldId);
    }
}
