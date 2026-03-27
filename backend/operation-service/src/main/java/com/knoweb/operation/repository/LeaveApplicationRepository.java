package com.knoweb.operation.repository;

import com.knoweb.operation.entity.LeaveApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LeaveApplicationRepository extends JpaRepository<LeaveApplication, UUID> {

    List<LeaveApplication> findByUserId(UUID userId);

    List<LeaveApplication> findByTenantId(UUID tenantId);

    List<LeaveApplication> findByUserIdAndStatus(UUID userId, String status);

    // Sum of days taken per leave type for a user (APPROVED only, current year)
    @Query("SELECT COALESCE(SUM(l.daysApplied), 0) FROM LeaveApplication l " +
           "WHERE l.userId = :userId AND l.leaveType = :leaveType AND l.status = 'APPROVED' " +
           "AND YEAR(l.fromDate) = YEAR(CURRENT_DATE)")
    int sumApprovedDaysByType(@Param("userId") UUID userId, @Param("leaveType") String leaveType);
}
