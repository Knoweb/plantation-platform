package com.knoweb.inventory.repository;

import com.knoweb.inventory.entity.DivisionalStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DivisionalStockRepository extends JpaRepository<DivisionalStock, Long> {
    List<DivisionalStock> findByTenantIdAndDivisionId(String tenantId, String divisionId);
    Optional<DivisionalStock> findByTenantIdAndDivisionIdAndItemId(String tenantId, String divisionId, Long itemId);
}
