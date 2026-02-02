package com.knoweb.inventory.controller;

import com.knoweb.inventory.dto.StockTransactionRequest;
import com.knoweb.inventory.entity.InventoryItem;
import com.knoweb.inventory.entity.InventoryTransaction;
import com.knoweb.inventory.service.InventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    @Autowired
    private InventoryService service;

    @GetMapping
    public List<InventoryItem> getInventory(@RequestParam String tenantId) {
        return service.getAllItems(tenantId);
    }

    @PostMapping
    public InventoryItem createItem(@RequestBody InventoryItem item) {
        return service.createItem(item);
    }

    @PostMapping("/transaction")
    public ResponseEntity<?> processTransaction(@RequestBody StockTransactionRequest request) {
        try {
            InventoryItem updated = service.processTransaction(request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/buffer")
    public ResponseEntity<InventoryItem> updateBuffer(@PathVariable Long id, @RequestBody int bufferLevel) {
        return ResponseEntity.ok(service.updateBuffer(id, bufferLevel));
    }

    @GetMapping("/transactions")
    public List<InventoryTransaction> getTransactions(@RequestParam String tenantId) {
        return service.getTransactions(tenantId);
    }

    @PutMapping("/transactions/{id}/status")
    public InventoryTransaction updateStatus(@PathVariable Long id, @RequestParam String status) {
        return service.updateTransactionStatus(id, status);
    }
}
