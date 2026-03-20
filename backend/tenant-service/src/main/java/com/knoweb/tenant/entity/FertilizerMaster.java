package com.knoweb.tenant.entity;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(
        name = "fertilizer_master",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = { "tenant_id", "name" })
        }
)
public class FertilizerMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    // e.g. Urea 46, AS 21
    @Column(name = "nitrogen_percent", nullable = false)
    private Double nitrogenPercent;

    public FertilizerMaster() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getNitrogenPercent() {
        return nitrogenPercent;
    }

    public void setNitrogenPercent(Double nitrogenPercent) {
        this.nitrogenPercent = nitrogenPercent;
    }
}

