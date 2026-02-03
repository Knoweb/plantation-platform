package com.knoweb.operation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class OperationServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OperationServiceApplication.class, args);
    }
}
