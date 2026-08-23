package com.meetspace.meetspace_backend.controller.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.meetspace.meetspace_backend.dto.auth.AuthRequest;
import com.meetspace.meetspace_backend.dto.auth.AuthRequest.Login;
import com.meetspace.meetspace_backend.dto.auth.AuthRequest.Signup;
import com.meetspace.meetspace_backend.dto.auth.AuthResponse;
import com.meetspace.meetspace_backend.service.AuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody Signup request) {
        return ResponseEntity.status(201).body(authService.signUpService(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody Login request) {
        return ResponseEntity.ok(authService.logInService(request));
    }
}
