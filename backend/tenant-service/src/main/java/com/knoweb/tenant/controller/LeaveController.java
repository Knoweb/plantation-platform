package com.knoweb.tenant.controller;

import com.knoweb.tenant.entity.LeaveQuota;
import com.knoweb.tenant.service.LeaveService;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/leaves")
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
