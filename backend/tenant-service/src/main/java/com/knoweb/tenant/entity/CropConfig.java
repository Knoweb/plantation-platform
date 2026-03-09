package com.knoweb.tenant.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "crop_configs")
public class CropConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(name = "crop_type", nullable = false)
    private String cropType;

    @Column(name = "budget_year")
    private Double budgetYear;

    @Column(name = "budget_apr") private Double budgetApr;
    @Column(name = "budget_may") private Double budgetMay;
    @Column(name = "budget_jun") private Double budgetJun;
    @Column(name = "budget_jul") private Double budgetJul;
    @Column(name = "budget_aug") private Double budgetAug;
    @Column(name = "budget_sep") private Double budgetSep;
    @Column(name = "budget_oct") private Double budgetOct;
    @Column(name = "budget_nov") private Double budgetNov;
    @Column(name = "budget_dec") private Double budgetDec;
    @Column(name = "budget_jan") private Double budgetJan;
    @Column(name = "budget_feb") private Double budgetFeb;
    @Column(name = "budget_mar") private Double budgetMar;

    @Column(name = "aththama_wage")
    private Double aththamaWage;

    @Column(name = "over_kilo_rate")
    private Double overKiloRate;

    @Column(name = "cash_kilo_rate")
    private Double cashKiloRate;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getCropType() {
        return cropType;
    }

    public void setCropType(String cropType) {
        this.cropType = cropType;
    }

    public Double getBudgetYear() {
        return budgetYear;
    }

    public void setBudgetYear(Double budgetYear) {
        this.budgetYear = budgetYear;
    }

    public Double getBudgetApr() { return budgetApr; }
    public void setBudgetApr(Double budgetApr) { this.budgetApr = budgetApr; }
    public Double getBudgetMay() { return budgetMay; }
    public void setBudgetMay(Double budgetMay) { this.budgetMay = budgetMay; }
    public Double getBudgetJun() { return budgetJun; }
    public void setBudgetJun(Double budgetJun) { this.budgetJun = budgetJun; }
    public Double getBudgetJul() { return budgetJul; }
    public void setBudgetJul(Double budgetJul) { this.budgetJul = budgetJul; }
    public Double getBudgetAug() { return budgetAug; }
    public void setBudgetAug(Double budgetAug) { this.budgetAug = budgetAug; }
    public Double getBudgetSep() { return budgetSep; }
    public void setBudgetSep(Double budgetSep) { this.budgetSep = budgetSep; }
    public Double getBudgetOct() { return budgetOct; }
    public void setBudgetOct(Double budgetOct) { this.budgetOct = budgetOct; }
    public Double getBudgetNov() { return budgetNov; }
    public void setBudgetNov(Double budgetNov) { this.budgetNov = budgetNov; }
    public Double getBudgetDec() { return budgetDec; }
    public void setBudgetDec(Double budgetDec) { this.budgetDec = budgetDec; }
    public Double getBudgetJan() { return budgetJan; }
    public void setBudgetJan(Double budgetJan) { this.budgetJan = budgetJan; }
    public Double getBudgetFeb() { return budgetFeb; }
    public void setBudgetFeb(Double budgetFeb) { this.budgetFeb = budgetFeb; }
    public Double getBudgetMar() { return budgetMar; }
    public void setBudgetMar(Double budgetMar) { this.budgetMar = budgetMar; }

    public Double getAththamaWage() {
        return aththamaWage;
    }

    public void setAththamaWage(Double aththamaWage) {
        this.aththamaWage = aththamaWage;
    }

    public Double getOverKiloRate() {
        return overKiloRate;
    }

    public void setOverKiloRate(Double overKiloRate) {
        this.overKiloRate = overKiloRate;
    }

    public Double getCashKiloRate() {
        return cashKiloRate;
    }

    public void setCashKiloRate(Double cashKiloRate) {
        this.cashKiloRate = cashKiloRate;
    }
}
