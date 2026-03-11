package com.knoweb.tenant.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Data
public class DailyCost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tenantId;
    private String cropType;
    private LocalDate date;

    @Column(columnDefinition = "TEXT")
    private String costData;
}
