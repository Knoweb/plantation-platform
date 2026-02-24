package com.knoweb.tenant.entity;


import com.knoweb.tenant.enums.WorkerGender;
import com.knoweb.tenant.enums.WorkerStatus;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "workers")
public class Worker {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "worker_id")
    private UUID id;

    @Column(name = "registration_number", nullable = false)
    private String registrationNumber;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false)
    private WorkerGender gender;



    @Column(name = "epf_number")
    private String epfNumber;

    @Column(name = "employment_type", length = 30)
    private String employmentType; // PERMANENT, CASUAL, CONTRACT

    @Column(name = "contractor_name")
    private String contractorName;

    @Column(name = "nic_number")
    private String nicNumber;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(name = "registered_date")
    private LocalDate registeredDate = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private WorkerStatus status;

    @ElementCollection
    @CollectionTable(name = "worker_divisions", joinColumns = @JoinColumn(name = "worker_id"))
    @Column(name = "division_id")
    private Set<String> divisionIds = new HashSet<>();

    public Worker() {
    }

    public Worker(String registrationNumber, String name, WorkerGender gender, String epfNumber,
            String tenantId, WorkerStatus status) {
        this.registrationNumber = registrationNumber;
        this.name = name;
        this.gender = gender;
        this.epfNumber = epfNumber;
        this.tenantId = tenantId;
        this.status = status;
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public WorkerGender getGender() {
        return gender;
    }

    public void setGender(WorkerGender gender) {
        this.gender = gender;
    }



    public String getEpfNumber() {
        return epfNumber;
    }

    public void setEpfNumber(String epfNumber) {
        this.epfNumber = epfNumber;
    }

    public String getEmploymentType() {
        return employmentType;
    }

    public void setEmploymentType(String employmentType) {
        this.employmentType = employmentType;
    }

    public String getContractorName() {
        return contractorName;
    }

    public void setContractorName(String contractorName) {
        this.contractorName = contractorName;
    }

    public String getNicNumber() {
        return nicNumber;
    }

    public void setNicNumber(String nicNumber) {
        this.nicNumber = nicNumber;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public LocalDate getRegisteredDate() {
        return registeredDate;
    }

    public void setRegisteredDate(LocalDate registeredDate) {
        this.registeredDate = registeredDate;
    }

    public WorkerStatus getStatus() {
        return status;
    }

    public void setStatus(WorkerStatus status) {
        this.status = status;
    }

    public Set<String> getDivisionIds() {
        return divisionIds;
    }

    public void setDivisionIds(Set<String> divisionIds) {
        this.divisionIds = divisionIds;
    }
}
