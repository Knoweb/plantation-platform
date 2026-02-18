package com.knoweb.tenant.service;

import com.knoweb.tenant.dto.DailyWorkRequest;
import com.knoweb.tenant.entity.DailyWork;
import com.knoweb.tenant.repository.DailyWorkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class DailyWorkService {

    private final DailyWorkRepository dailyWorkRepository;
    private final com.knoweb.tenant.repository.AttendanceRepository attendanceRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public DailyWorkService(DailyWorkRepository dailyWorkRepository, com.knoweb.tenant.repository.AttendanceRepository attendanceRepository, com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.dailyWorkRepository = dailyWorkRepository;
        this.attendanceRepository = attendanceRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public DailyWork submitWork(DailyWorkRequest request) {
        DailyWork work = new DailyWork();
        work.setTenantId(request.getTenantId());
        work.setDivisionId(request.getDivisionId());
        work.setWorkDate(request.getWorkDate());
        work.setWorkType(request.getWorkType());
        work.setDetails(request.getDetails());
        work.setQuantity(request.getQuantity());
        work.setWorkerCount(request.getWorkerCount());
        work.setStatus("PENDING");
        work.setCreatedAt(java.time.LocalDateTime.now());
        return dailyWorkRepository.save(work);
    }

    @Transactional
    public DailyWork approveWork(UUID workId) {
        DailyWork work = dailyWorkRepository.findById(workId)
                .orElseThrow(() -> new RuntimeException("Work record not found"));
        
        if ("APPROVED".equals(work.getStatus())) {
            return work;
        }

        // Sync Attendance
        try {
            if (work.getDetails() != null && work.getDetails().trim().startsWith("[")) {
                com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(work.getDetails());
                if (root.isArray()) {
                    for (com.fasterxml.jackson.databind.JsonNode taskNode : root) {
                        String taskType = taskNode.has("task") ? taskNode.get("task").asText() : work.getWorkType();
                        String fieldName = taskNode.has("field") ? taskNode.get("field").asText() : "Unknown Field";
                        
                        if (taskNode.has("assigned")) {
                            for (com.fasterxml.jackson.databind.JsonNode workerNode : taskNode.get("assigned")) {
                                 String workerId = workerNode.has("id") ? workerNode.get("id").asText() : null;
                                 if (workerId != null) {
                                     com.knoweb.tenant.entity.Attendance att = new com.knoweb.tenant.entity.Attendance(
                                         work.getTenantId(), 
                                         workerId, 
                                         work.getWorkDate(), 
                                         taskType, 
                                         fieldName, 
                                         work.getWorkId()
                                     );
                                     attendanceRepository.save(att);
                                 }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Log logic here if logging existed
            System.err.println("Failed to sync attendance for workId: " + workId + " Error: " + e.getMessage());
            // We proceed with Approval even if sync fails, OR throw?
            // Safer to throw to ensure data consistency
            throw new RuntimeException("Failed to sync attendance: " + e.getMessage());
        }

        work.setStatus("APPROVED");
        work.setActionAt(java.time.LocalDateTime.now());
        return dailyWorkRepository.save(work);
    }

    @Transactional
    public DailyWork rejectWork(UUID workId) {
        DailyWork work = dailyWorkRepository.findById(workId)
                .orElseThrow(() -> new RuntimeException("Work record not found"));
        work.setStatus("REJECTED");
        work.setActionAt(java.time.LocalDateTime.now());
        return dailyWorkRepository.save(work);
    }

    public List<DailyWork> getRecordsByTenant(UUID tenantId) {
        return dailyWorkRepository.findByTenantId(tenantId);
    }

    public List<DailyWork> getPendingRecords(UUID tenantId) {
        return dailyWorkRepository.findByTenantIdAndStatus(tenantId, "PENDING");
    }

    public List<DailyWork> getRecordsByDivision(UUID tenantId, String divisionId) {
        return dailyWorkRepository.findByTenantIdAndDivisionId(tenantId, divisionId);
    }

    @Transactional
    public void deleteWork(UUID id) {
        dailyWorkRepository.deleteById(id);
    }
}
