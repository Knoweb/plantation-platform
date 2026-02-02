package com.knoweb.inventory.repository;

import com.knoweb.inventory.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByTenantId(String tenantId);

    Optional<InventoryItem> findByTenantIdAndName(String tenantId, String name);
}
