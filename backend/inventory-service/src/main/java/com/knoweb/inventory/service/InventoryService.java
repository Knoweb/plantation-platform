package com.knoweb.inventory.service;

import com.knoweb.inventory.dto.StockTransactionRequest;
import com.knoweb.inventory.entity.InventoryItem;
import com.knoweb.inventory.entity.InventoryTransaction;
import com.knoweb.inventory.repository.InventoryItemRepository;
import com.knoweb.inventory.repository.InventoryTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class InventoryService {

    @Autowired
    private InventoryItemRepository repository;

    @Autowired
    private InventoryTransactionRepository transactionRepository;

    public List<InventoryItem> getAllItems(String tenantId) {
        // Ensure new items are seeded
        if (repository.findByTenantIdAndName(tenantId, "Glyphosate 360").isEmpty()) {
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

        InventoryItem savedItem = repository.save(item);

        // Record Transaction
        InventoryTransaction trans = new InventoryTransaction();
        trans.setItemId(item.getId());
        trans.setItemName(item.getName());
        trans.setType(req.getType());
        trans.setQuantity(req.getQuantity());
        trans.setDate(LocalDateTime.now());
        trans.setTenantId(req.getTenantId());
        trans.setIssuedTo(req.getIssuedTo());

        if ("RESTOCK_REQUEST".equals(req.getType())) {
            trans.setStatus("PENDING");
        } else {
            trans.setStatus("COMPLETED");
        }

        transactionRepository.save(trans);

        return savedItem;
    }

    public List<InventoryTransaction> getTransactions(String tenantId) {
        return transactionRepository.findByTenantIdOrderByDateDesc(tenantId);
    }

    public InventoryTransaction updateTransactionStatus(Long id, String status) {
        InventoryTransaction trans = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        if ("APPROVED".equals(status) && "PENDING".equals(trans.getStatus())
                && "RESTOCK_REQUEST".equals(trans.getType())) {
            // Refill Stock
            InventoryItem item = repository.findById(trans.getItemId())
                    .orElseThrow(() -> new RuntimeException("Item not found"));
            item.setCurrentQuantity(item.getCurrentQuantity() + trans.getQuantity());
            repository.save(item);
        }

        trans.setStatus(status);
        return transactionRepository.save(trans);
    }

    private void seedData(String tenantId) {
        seedItem(tenantId, "Urea Fertilizer", "FERTILIZER", "kg", 800, 1000);
        seedItem(tenantId, "Picking Basket", "TOOL", "units", 150, 50);
        seedItem(tenantId, "Glyphosate 360", "CHEMICAL", "liters", 50, 20);
        seedItem(tenantId, "Safety Gloves", "SAFETY", "pairs", 200, 50);
        seedItem(tenantId, "Rubber Boots", "SAFETY", "pairs", 40, 45);
        seedItem(tenantId, "Pruning Shears", "TOOL", "units", 80, 20);
    }

    private void seedItem(String tenantId, String name, String cat, String unit, int qty, int buff) {
        if (repository.findByTenantIdAndName(tenantId, name).isEmpty()) {
            InventoryItem item = new InventoryItem();
            item.setName(name);
            item.setCategory(cat);
            item.setUnit(unit);
            item.setCurrentQuantity(qty);
            item.setBufferLevel(buff);
            item.setTenantId(tenantId);
            repository.save(item);
        }
    }
}
