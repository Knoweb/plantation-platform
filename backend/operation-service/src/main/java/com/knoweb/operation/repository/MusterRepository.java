package com.knoweb.operation.repository;

import com.knoweb.operation.entity.Muster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MusterRepository extends JpaRepository<Muster, Long> {
    List<Muster> findByTenantIdOrderByDateDesc(String tenantId);

    List<Muster> findByTenantIdAndDivisionIdOrderByDateDesc(String tenantId, String divisionId);

    List<Muster> findByDivisionIdAndDate(String divisionId, java.time.LocalDate date);
}
