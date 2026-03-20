package com.knoweb.operation.service;

import com.knoweb.operation.entity.Norm;
import com.knoweb.operation.repository.NormRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class NormService {

    @Autowired
    private NormRepository normRepository;

    public List<Norm> getAllNorms(String tenantStr) {
        UUID tenantId = UUID.fromString(tenantStr);
        return normRepository.findByTenantIdOrderByEffectiveDateDesc(tenantId);
    }

    public Norm getActiveNorm(String tenantStr, String jobRole, LocalDate targetDate) {
        UUID tenantId = UUID.fromString(tenantStr);
        return normRepository.findActiveNormForRole(tenantId, jobRole, targetDate)
                .orElse(null);
    }

    @Transactional
    public Norm createNorm(String tenantStr, Norm normObj) {
        UUID tenantId = UUID.fromString(tenantStr);
        normObj.setTenantId(tenantId);
        return normRepository.save(normObj);
    }

    @Transactional
    public Norm updateNorm(UUID normId, Norm updatedData) {
        Optional<Norm> existingOpt = normRepository.findById(normId);
        if (existingOpt.isPresent()) {
            Norm existing = existingOpt.get();
            existing.setTargetValue(updatedData.getTargetValue());
            existing.setUnit(updatedData.getUnit());
            existing.setEffectiveDate(updatedData.getEffectiveDate());
            existing.setEndDate(updatedData.getEndDate());
            return normRepository.save(existing);
        }
        return null;
    }

    @Transactional
    public void deleteNorm(UUID normId) {
        normRepository.deleteById(normId);
    }
}
