package com.knoweb.tenant.service;

import com.knoweb.tenant.entity.Worker;
import com.knoweb.tenant.enums.WorkerStatus;
import com.knoweb.tenant.repository.WorkerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class WorkerService {

    @Autowired
    private WorkerRepository workerRepository;

    public Worker createWorker(Worker worker) {
        if (worker.getStatus() == null) {
            worker.setStatus(WorkerStatus.ACTIVE);
        }
        return workerRepository.save(worker);
    }

    public List<Worker> getAllWorkers(String tenantId) {
        return workerRepository.findByTenantIdAndStatus(tenantId, WorkerStatus.ACTIVE);
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
        worker.setJobRole(workerDetails.getJobRole());
        worker.setEpfNumber(workerDetails.getEpfNumber());
        worker.setDivisionIds(workerDetails.getDivisionIds());
        worker.setStatus(workerDetails.getStatus());

        return workerRepository.save(worker);
    }

    public void deleteWorker(UUID id) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Worker not found with id: " + id));
        worker.setStatus(WorkerStatus.INACTIVE); // Soft delete
        workerRepository.save(worker);
    }
}
