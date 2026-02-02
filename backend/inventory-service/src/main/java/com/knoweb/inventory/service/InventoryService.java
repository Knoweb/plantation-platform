package com.knoweb.inventory.service;

import com.knoweb.inventory.dto.StockTransactionRequest;
import com.knoweb.inventory.entity.InventoryItem;
import com.knoweb.inventory.repository.InventoryItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InventoryService {

    @Autowired
    private InventoryItemRepository repository;

    public List<InventoryItem> getAllItems(String tenantId) {
        // Simple seeding (MVP)
        if (repository.findByTenantId(tenantId).isEmpty()) {
            seedData(tenantId);
        }
        return repository.findByTenantId(tenantId);
    }

    public InventoryItem createItem(InventoryItem item) {
        return repository.save(item);
    }

    public InventoryItem updateBuffer(Long id, int newBuffer) {
        InventoryItem item = repository.findById(id).orElseThrow(() -> new RuntimeException("Item not found"));
        item.setBufferLevel(newBuffer);
        return repository.save(item);
    }

    public InventoryItem processTransaction(StockTransactionRequest req) {
        InventoryItem item = repository.findById(req.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if ("RECEIPT".equals(req.getType())) {
            item.setCurrentQuantity(item.getCurrentQuantity() + req.getQuantity());
        } else if ("ISSUE".equals(req.getType())) {
            if (item.getCurrentQuantity() < req.getQuantity()) {
                throw new RuntimeException("Insufficient Stock! Available: " + item.getCurrentQuantity());
            }
            item.setCurrentQuantity(item.getCurrentQuantity() - req.getQuantity());
        }

        return repository.save(item);
    }

    private void seedData(String tenantId) {
        InventoryItem urea = new InventoryItem();
        urea.setName("Urea Fertilizer");
        urea.setCategory("FERTILIZER");
        urea.setUnit("kg");
        urea.setCurrentQuantity(800);
        urea.setBufferLevel(1000); // Already low!
        urea.setTenantId(tenantId);
        repository.save(urea);

        InventoryItem basket = new InventoryItem();
        basket.setName("Picking Basket");
        basket.setCategory("TOOL");
        basket.setUnit("units");
        basket.setCurrentQuantity(150);
        basket.setBufferLevel(50);
        basket.setTenantId(tenantId);
        repository.save(basket);
    }
}
