package com.knoweb.tenant.service;

import com.knoweb.tenant.entity.Worker;
import com.knoweb.tenant.enums.WorkerStatus;
import com.knoweb.tenant.repository.WorkerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import com.knoweb.tenant.websocket.TenantRealtimePublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.annotation.PostConstruct;

@Service
public class WorkerService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TenantRealtimePublisher publisher;

    @PostConstruct
    public void init() {
        try {
            jdbcTemplate.execute("ALTER TABLE workers DROP COLUMN job_role CASCADE;");
        } catch (Exception e) {
            // Column may already be dropped or table missing, safe to ignore
        }
        
        try {
            jdbcTemplate.execute("ALTER TABLE workers DROP CONSTRAINT workers_status_check;");
            System.out.println("Constraint workers_status_check dropped successfully.");
        } catch (Exception e) {
            System.out.println("Constraint workers_status_check not found or already dropped.");
        }
    }

    @Autowired
    private WorkerRepository workerRepository;

    public Worker createWorker(Worker worker) {
        if (worker.getStatus() == null) {
            worker.setStatus(WorkerStatus.ACTIVE);
        }
        Worker saved = workerRepository.save(worker);
        publisher.broadcastWorkerUpdated(saved.getTenantId(), saved.getId().toString(), saved.getStatus().toString());
        return saved;
    }

    public List<Worker> getAllWorkers(String tenantId) {
        return workerRepository.findByTenantId(tenantId).stream()
                .filter(w -> w.getStatus() != WorkerStatus.INACTIVE)
                .toList();
    }

    public List<Worker> getWorkersByDivision(String divisionId) {
        return workerRepository.findByDivisionId(divisionId);
    }

    public Worker updateWorker(UUID id, Worker workerDetails) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Worker not found with id: " + id));

        worker.setName(workerDetails.getName());
        worker.setRegistrationNumber(workerDetails.getRegistrationNumber());
        worker.setGender(workerDetails.getGender());
        worker.setEpfNumber(workerDetails.getEpfNumber());
        worker.setEtfNumber(workerDetails.getEtfNumber());
        worker.setEmploymentType(workerDetails.getEmploymentType());
        worker.setContractorName(workerDetails.getContractorName());
        worker.setNicNumber(workerDetails.getNicNumber());
        worker.setDateOfBirth(workerDetails.getDateOfBirth());
        worker.setJoinedDate(workerDetails.getJoinedDate());
        worker.setDivisionIds(workerDetails.getDivisionIds());
        worker.setStatus(workerDetails.getStatus());

        Worker saved = workerRepository.save(worker);
        publisher.broadcastWorkerUpdated(saved.getTenantId(), saved.getId().toString(), saved.getStatus().toString());
        return saved;
    }

    public void deleteWorker(UUID id) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Worker not found with id: " + id));
        worker.setStatus(WorkerStatus.INACTIVE); // Soft delete
        Worker saved = workerRepository.save(worker);
        publisher.broadcastWorkerUpdated(saved.getTenantId(), saved.getId().toString(), "INACTIVE");
    }

    public void seedWorkers(String tenantId) {
        // Clear existing for this tenant
        List<Worker> existing = workerRepository.findByTenantId(tenantId);
        workerRepository.deleteAll(existing);

        // 1. Permanent Workers (Need EPF)
        Worker w1 = new Worker("P-001", "Sunil Perera", com.knoweb.tenant.enums.WorkerGender.MALE, "EPF-12094", tenantId, WorkerStatus.ACTIVE);
        w1.setEmploymentType("PERMANENT");
        w1.setNicNumber("19801234567V");
        w1.setDateOfBirth(LocalDate.of(1980, 5, 10));
        
        Worker w2 = new Worker("P-002", "Pushpa Kumari", com.knoweb.tenant.enums.WorkerGender.FEMALE, "EPF-98234", tenantId, WorkerStatus.ACTIVE);
        w2.setEmploymentType("PERMANENT");
        w2.setNicNumber("19881234568V");
        w2.setDateOfBirth(LocalDate.of(1988, 7, 20));

        // 2. Casual Workers (Need NIC & DOB, no EPF)
        Worker w3 = new Worker("C-001", "Nimal Fernando", com.knoweb.tenant.enums.WorkerGender.MALE, null, tenantId, WorkerStatus.ACTIVE);
        w3.setEmploymentType("CASUAL");
        w3.setNicNumber("19851234567V");
        w3.setDateOfBirth(LocalDate.of(1985, 4, 12));

        Worker w4 = new Worker("C-002", "Kamala Shiranthi", com.knoweb.tenant.enums.WorkerGender.FEMALE, null, tenantId, WorkerStatus.ACTIVE);
        w4.setEmploymentType("CASUAL");
        w4.setNicNumber("19902345678V");
        w4.setDateOfBirth(LocalDate.of(1990, 8, 22));

        // 3. Contract Workers (Need Contractor Name & Registered Date)
        String todayStr = LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyMM"));
        
        Worker w5 = new Worker("CN-" + todayStr + "001", "Kasun Silva", com.knoweb.tenant.enums.WorkerGender.MALE, null, tenantId, WorkerStatus.ACTIVE);
        w5.setEmploymentType("CONTRACT");
        w5.setContractorName("Ravi Manpower");
        w5.setRegisteredDate(LocalDate.now());

        Worker w6 = new Worker("CN-" + todayStr + "002", "Ruwan Ekanayake", com.knoweb.tenant.enums.WorkerGender.MALE, null, tenantId, WorkerStatus.ACTIVE);
        w6.setEmploymentType("CONTRACT");
        w6.setContractorName("Silva Suppliers");
        w6.setRegisteredDate(LocalDate.now());

        workerRepository.saveAll(Arrays.asList(w1, w2, w3, w4, w5, w6));
    }
}
