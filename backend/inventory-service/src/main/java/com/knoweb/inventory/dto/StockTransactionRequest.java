package com.knoweb.inventory.dto;

import lombok.Data;

@Data
public class StockTransactionRequest {
    private Long itemId;
    private int quantity;
    private String type; // ISSUE or RECEIPT
    private String tenantId;
}
