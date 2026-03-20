package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.WorkProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkProgramRepository extends JpaRepository<WorkProgram, Long> {
    List<WorkProgram> findByTenantIdAndYearAndMonth(String tenantId, int year, int month);
    Optional<WorkProgram> findByTenantIdAndYearAndMonthAndTaskName(String tenantId, int year, int month, String taskName);
}
