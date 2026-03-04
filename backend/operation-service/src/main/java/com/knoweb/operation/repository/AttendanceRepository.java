package com.knoweb.operation.repository;

import com.knoweb.operation.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    List<Attendance> findByTenantId(UUID tenantId);
    List<Attendance> findByTenantIdAndWorkDate(UUID tenantId, LocalDate workDate);
    void deleteByDailyWorkId(UUID dailyWorkId);
}
