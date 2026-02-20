package com.knoweb.operation.controller;

import com.knoweb.operation.entity.LeaveQuota;
import com.knoweb.operation.service.LeaveService;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/operations/leaves")
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @GetMapping("/users/{userId}/quota")
    public LeaveQuota getQuota(@PathVariable UUID userId) {
        return leaveService.getQuotaForUser(userId);
    }

    @PutMapping("/users/{userId}/quota")
    public LeaveQuota updateQuota(@PathVariable UUID userId, @RequestBody LeaveQuota quota) {
        return leaveService.updateQuota(userId, quota);
    }
}
