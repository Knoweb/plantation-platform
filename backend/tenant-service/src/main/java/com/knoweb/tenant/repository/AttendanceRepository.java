package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.List;
import java.time.LocalDate;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    List<Attendance> findByTenantIdAndWorkDate(UUID tenantId, LocalDate workDate);
    List<Attendance> findByWorkerId(String workerId);
    List<Attendance> findByTenantId(UUID tenantId);
}
