package com.knoweb.tenant.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "divisions", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "tenant_id", "name" }) // Division names unique per tenant
})
public class Division {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "division_id")
    private UUID divisionId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    // Optional: Manager responsible for this division?
    // private UUID managerId;

    public Division() {
    }

    public Division(UUID tenantId, String name) {
        this.tenantId = tenantId;
        this.name = name;
    }

    public UUID getDivisionId() {
        return divisionId;
    }

    public void setDivisionId(UUID divisionId) {
        this.divisionId = divisionId;
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

    @ManyToMany(mappedBy = "divisions")
    private java.util.Set<User> users = new java.util.HashSet<>();

    public java.util.Set<User> getUsers() {
        return users;
    }

    public void setUsers(java.util.Set<User> users) {
        this.users = users;
    }
}
