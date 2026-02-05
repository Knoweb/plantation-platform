package com.knoweb.tenant.service;

import com.knoweb.tenant.entity.Division;
import com.knoweb.tenant.repository.DivisionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class DivisionService {

    private final DivisionRepository divisionRepository;

    public DivisionService(DivisionRepository divisionRepository) {
        this.divisionRepository = divisionRepository;
    }

    public Division createDivision(UUID tenantId, String name) {
        // TODO: check subscription limits?
        Division division = new Division(tenantId, name);
        return divisionRepository.save(division);
    }

    public List<Division> getDivisionsByTenant(UUID tenantId) {
        return divisionRepository.findByTenantId(tenantId);
    }

    public Division updateDivision(UUID divisionId, String newName) {
        return divisionRepository.findById(divisionId)
                .map(div -> {
                    div.setName(newName);
                    return divisionRepository.save(div);
                })
                .orElseThrow(() -> new RuntimeException("Division not found"));
    }

    public void deleteDivision(UUID divisionId) {
        // Remove relationship from users first
        Division division = divisionRepository.findById(divisionId)
                .orElseThrow(() -> new RuntimeException("Division not found"));

        for (com.knoweb.tenant.entity.User user : division.getUsers()) {
            user.getDivisions().remove(division);
        }
        divisionRepository.deleteById(divisionId);
    }
}
