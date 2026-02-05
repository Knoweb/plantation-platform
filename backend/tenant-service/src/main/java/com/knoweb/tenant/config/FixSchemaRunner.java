package com.knoweb.tenant.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

@Component
public class FixSchemaRunner implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            // Hard delete all worker data as requested
            jdbcTemplate.execute("DELETE FROM worker_divisions");
            jdbcTemplate.execute("DELETE FROM workers");
            System.out.println("--- ALL WORKER DATA DELETED FROM DATABASE ---");
            
            // Drop constraint just in case it's back or needed
            jdbcTemplate.execute("ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_job_role_check");
        } catch (Exception e) {
            System.err.println("Warning: Could not drop constraint (might not exist or different name): " + e.getMessage());
        }
    }
}
