package com.knoweb.inventory.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "inventory_items")
public class InventoryItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String category; // FERTILIZER, CHEMICAL, TOOL
    private String unit; // kg, L, units

    private int currentQuantity;
    private int bufferLevel; // Set by Manager

    private String tenantId;
}
