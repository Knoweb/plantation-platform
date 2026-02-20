package com.knoweb.operation.service;

import com.knoweb.operation.entity.Attendance;
import com.knoweb.operation.repository.AttendanceRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;

    public AttendanceService(AttendanceRepository attendanceRepository) {
        this.attendanceRepository = attendanceRepository;
    }

    public List<Attendance> getAttendance(UUID tenantId, LocalDate date) {
        if (date != null) {
            return attendanceRepository.findByTenantIdAndWorkDate(tenantId, date);
        }
        return attendanceRepository.findByTenantId(tenantId);
    }

    @org.springframework.transaction.annotation.Transactional
    public void updateEveningMuster(List<java.util.Map<String, Object>> updates) {
        for (java.util.Map<String, Object> update : updates) {
            try {
                String idStr = (String) update.get("id");
                if (idStr == null) continue;
                UUID id = UUID.fromString(idStr);
                
                Attendance att = attendanceRepository.findById(id).orElse(null);
                if (att != null) {
                    if (update.containsKey("am")) {
                        Object am = update.get("am");
                        att.setAmWeight(am instanceof Number ? ((Number) am).doubleValue() : null);
                    }
                    if (update.containsKey("pm")) {
                        Object pm = update.get("pm");
                        att.setPmWeight(pm instanceof Number ? ((Number) pm).doubleValue() : null);
                    }
                    if (update.containsKey("status")) {
                        att.setStatus((String) update.get("status"));
                    }
                    att.setUpdatedAt(java.time.LocalDateTime.now());
                    attendanceRepository.save(att);
                }
            } catch (Exception e) {
                throw new RuntimeException("Failed to update attendance record: " + e.getMessage());
            }
        }
    }
}
