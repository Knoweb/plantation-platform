package com.knoweb.tenant.repository;

import com.knoweb.tenant.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface WorkerRepository extends JpaRepository<Worker, UUID> {

    List<Worker> findByTenantId(String tenantId);

    @Query("SELECT w FROM Worker w JOIN w.divisionIds d WHERE d = :divisionId")
    List<Worker> findByDivisionId(@Param("divisionId") String divisionId);

    List<Worker> findByTenantIdAndStatus(String tenantId, com.knoweb.tenant.enums.WorkerStatus status);
}
