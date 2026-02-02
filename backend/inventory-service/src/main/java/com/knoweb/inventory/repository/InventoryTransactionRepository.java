package com.knoweb.inventory.repository;

import com.knoweb.inventory.entity.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {
    List<InventoryTransaction> findByTenantIdOrderByDateDesc(String tenantId);
}
