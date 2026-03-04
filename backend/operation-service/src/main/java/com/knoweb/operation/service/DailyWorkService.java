package com.knoweb.operation.service;

import com.knoweb.operation.dto.DailyWorkRequest;
import com.knoweb.operation.dto.ReviewRequest;
import com.knoweb.operation.entity.DailyWork;
import com.knoweb.operation.repository.DailyWorkRepository;
import com.knoweb.operation.repository.AttendanceRepository;
import com.knoweb.operation.entity.Attendance;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class DailyWorkService {

    private final DailyWorkRepository dailyWorkRepository;
    private final AttendanceRepository attendanceRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public DailyWorkService(DailyWorkRepository dailyWorkRepository, AttendanceRepository attendanceRepository, com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
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
        work.setCreatedAt(java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Colombo")));
        return dailyWorkRepository.save(work);
    }

    @Transactional
    public DailyWork approveWork(UUID workId, ReviewRequest request) {
        DailyWork work = dailyWorkRepository.findById(workId)
                .orElseThrow(() -> new RuntimeException("Work record not found"));
        
        // Removed the early return for "APPROVED" to allow updating details/workers even if already approved.

        if (request != null) {
            if (request.getDetails() != null) work.setDetails(request.getDetails());
            if (request.getWorkerCount() != null) work.setWorkerCount(request.getWorkerCount());
            if (request.getRemarks() != null) work.setRemarks(request.getRemarks());
        }

        // Sync Attendance
        try {
            // First clear out any existing attendance for this muster to prevent duplicates on update
            attendanceRepository.deleteByDailyWorkId(workId);

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
                                     Attendance att = new Attendance(
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
            throw new RuntimeException("Failed to sync attendance: " + e.getMessage());
        }

        work.setStatus("APPROVED");
        work.setActionAt(java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Colombo")));
        return dailyWorkRepository.save(work);
    }

    @Transactional
    public DailyWork rejectWork(UUID workId, ReviewRequest request) {
        DailyWork work = dailyWorkRepository.findById(workId)
                .orElseThrow(() -> new RuntimeException("Work record not found"));

        if (request != null) {
            if (request.getRemarks() != null) work.setRemarks(request.getRemarks());
        }

        work.setStatus("REJECTED");
        work.setActionAt(java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Colombo")));
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
