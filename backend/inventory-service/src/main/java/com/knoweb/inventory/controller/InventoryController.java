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

    // Keep inventory endpoints centralized under /api/inventory for gateway routing.
    @GetMapping
    public List<InventoryItem> getInventory(@RequestParam String tenantId) {
        return service.getAllItems(tenantId);
    }

    @GetMapping("/divisional")
    public ResponseEntity<List<com.knoweb.inventory.entity.DivisionalStock>> getDivisionalStock(
            @RequestParam String tenantId,
            @RequestParam String divisionId) {
        return ResponseEntity.ok(service.getDivisionalStock(tenantId, divisionId));
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
    public InventoryTransaction updateStatus(@PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) Integer quantity,
            @RequestParam(required = false) String remarks,
            @RequestParam(required = false) String issuedTo) {
        return service.updateTransactionStatus(id, status, quantity, remarks, issuedTo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        service.deleteItem(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryItem> updateItem(@PathVariable Long id, @RequestBody InventoryItem item) {
        return ResponseEntity.ok(service.updateItemDetails(id, item));
    }

}
