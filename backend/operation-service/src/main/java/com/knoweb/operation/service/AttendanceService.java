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
                
                if (idStr.startsWith("temp-")) {
                    Attendance att = new Attendance();
                    att.setTenantId(UUID.fromString((String) update.get("tenantId")));
                    att.setWorkerId((String) update.get("workerId"));
                    att.setWorkDate(java.time.LocalDate.parse((String) update.get("workDate")));
                    att.setDailyWorkId(UUID.fromString((String) update.get("dailyWorkId")));
                    att.setWorkType((String) update.get("workType"));
                    att.setFieldName((String) update.get("fieldName"));
                    
                    if (update.containsKey("am")) {
                        Object am = update.get("am");
                        att.setAmWeight(am instanceof Number ? ((Number) am).doubleValue() : null);
                    }
                    if (update.containsKey("pm")) {
                        Object pm = update.get("pm");
                        att.setPmWeight(pm instanceof Number ? ((Number) pm).doubleValue() : null);
                    }
                    if (update.containsKey("overKilos")) {
                        Object ok = update.get("overKilos");
                        att.setOverKilos(ok instanceof Number ? ((Number) ok).doubleValue() : null);
                    }
                    if (update.containsKey("completedQuantity")) {
                        Object cq = update.get("completedQuantity");
                        att.setCompletedQuantity(cq instanceof Number ? ((Number) cq).doubleValue() : null);
                    }
                    if (update.containsKey("otHours")) {
                        Object ot = update.get("otHours");
                        att.setOtHours(ot instanceof Number ? ((Number) ot).doubleValue() : null);
                    }
                    if (update.containsKey("cashKilos")) {
                        Object cq = update.get("cashKilos");
                        att.setCashKilos(cq instanceof Number ? ((Number) cq).doubleValue() : null);
                    }
                    if (update.containsKey("status")) {
                        att.setStatus((String) update.get("status"));
                    }
                    if (update.containsKey("session")) {
                        att.setSession((String) update.get("session"));
                    }
                    att.setUpdatedAt(java.time.LocalDateTime.now());
                    attendanceRepository.save(att);
                    continue;
                }

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
                    if (update.containsKey("overKilos")) {
                        Object ok = update.get("overKilos");
                        att.setOverKilos(ok instanceof Number ? ((Number) ok).doubleValue() : null);
                    }
                    if (update.containsKey("completedQuantity")) {
                        Object cq = update.get("completedQuantity");
                        att.setCompletedQuantity(cq instanceof Number ? ((Number) cq).doubleValue() : null);
                    }
                    if (update.containsKey("otHours")) {
                        Object ot = update.get("otHours");
                        att.setOtHours(ot instanceof Number ? ((Number) ot).doubleValue() : null);
                    }
                    if (update.containsKey("cashKilos")) {
                        Object cq = update.get("cashKilos");
                        att.setCashKilos(cq instanceof Number ? ((Number) cq).doubleValue() : null);
                    }
                    if (update.containsKey("status")) {
                        att.setStatus((String) update.get("status"));
                    }
                    if (update.containsKey("session")) {
                        att.setSession((String) update.get("session"));
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
