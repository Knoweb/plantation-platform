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

    @Column(name = "working_days_apr") private Double workingDaysApr;
    @Column(name = "working_days_may") private Double workingDaysMay;
    @Column(name = "working_days_jun") private Double workingDaysJun;
    @Column(name = "working_days_jul") private Double workingDaysJul;
    @Column(name = "working_days_aug") private Double workingDaysAug;
    @Column(name = "working_days_sep") private Double workingDaysSep;
    @Column(name = "working_days_oct") private Double workingDaysOct;
    @Column(name = "working_days_nov") private Double workingDaysNov;
    @Column(name = "working_days_dec") private Double workingDaysDec;
    @Column(name = "working_days_jan") private Double workingDaysJan;
    @Column(name = "working_days_feb") private Double workingDaysFeb;
    @Column(name = "working_days_mar") private Double workingDaysMar;

    @Column(name = "aththama_wage")
    private Double aththamaWage;

    @Column(name = "over_kilo_rate")
    private Double overKiloRate;

    @Column(name = "cash_kilo_rate")
    private Double cashKiloRate;

    @Column(name = "ot_hour_rate")
    private Double otHourRate;

    // JSON string storing cost analysis items, managed by Chief Clerk
    @Column(name = "cost_items", columnDefinition = "TEXT")
    private String costItems;

    @Column(name = "working_day_calendar", columnDefinition = "TEXT")
    private String workingDayCalendar;

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

    public Double getWorkingDaysApr() { return workingDaysApr; }
    public void setWorkingDaysApr(Double workingDaysApr) { this.workingDaysApr = workingDaysApr; }
    public Double getWorkingDaysMay() { return workingDaysMay; }
    public void setWorkingDaysMay(Double workingDaysMay) { this.workingDaysMay = workingDaysMay; }
    public Double getWorkingDaysJun() { return workingDaysJun; }
    public void setWorkingDaysJun(Double workingDaysJun) { this.workingDaysJun = workingDaysJun; }
    public Double getWorkingDaysJul() { return workingDaysJul; }
    public void setWorkingDaysJul(Double workingDaysJul) { this.workingDaysJul = workingDaysJul; }
    public Double getWorkingDaysAug() { return workingDaysAug; }
    public void setWorkingDaysAug(Double workingDaysAug) { this.workingDaysAug = workingDaysAug; }
    public Double getWorkingDaysSep() { return workingDaysSep; }
    public void setWorkingDaysSep(Double workingDaysSep) { this.workingDaysSep = workingDaysSep; }
    public Double getWorkingDaysOct() { return workingDaysOct; }
    public void setWorkingDaysOct(Double workingDaysOct) { this.workingDaysOct = workingDaysOct; }
    public Double getWorkingDaysNov() { return workingDaysNov; }
    public void setWorkingDaysNov(Double workingDaysNov) { this.workingDaysNov = workingDaysNov; }
    public Double getWorkingDaysDec() { return workingDaysDec; }
    public void setWorkingDaysDec(Double workingDaysDec) { this.workingDaysDec = workingDaysDec; }
    public Double getWorkingDaysJan() { return workingDaysJan; }
    public void setWorkingDaysJan(Double workingDaysJan) { this.workingDaysJan = workingDaysJan; }
    public Double getWorkingDaysFeb() { return workingDaysFeb; }
    public void setWorkingDaysFeb(Double workingDaysFeb) { this.workingDaysFeb = workingDaysFeb; }
    public Double getWorkingDaysMar() { return workingDaysMar; }
    public void setWorkingDaysMar(Double workingDaysMar) { this.workingDaysMar = workingDaysMar; }

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

    public Double getOtHourRate() {
        return otHourRate;
    }

    public void setOtHourRate(Double otHourRate) {
        this.otHourRate = otHourRate;
    }

    public String getCostItems() {
        return costItems;
    }

    public void setCostItems(String costItems) {
        this.costItems = costItems;
    }

    public String getWorkingDayCalendar() {
        return workingDayCalendar;
    }

    public void setWorkingDayCalendar(String workingDayCalendar) {
        this.workingDayCalendar = workingDayCalendar;
    }
}
