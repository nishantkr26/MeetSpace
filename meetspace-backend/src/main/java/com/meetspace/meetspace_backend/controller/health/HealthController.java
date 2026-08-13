package com.meetspace.meetspace_backend.controller.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    
    @GetMapping
    public String health(){
        return "Meetspace backend is running";
    }
}
