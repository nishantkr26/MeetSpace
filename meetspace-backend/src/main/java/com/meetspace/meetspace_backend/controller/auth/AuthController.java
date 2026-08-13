package com.meetspace.meetspace_backend.controller.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import com.meetspace.meetspace_backend.dto.AuthRequest;
import com.meetspace.meetspace_backend.dto.AuthRequest.Login;
import com.meetspace.meetspace_backend.dto.AuthRequest.Signup;
import com.meetspace.meetspace_backend.services.AuthService;

import lombok.RequiredArgsConstructor;

@Controller
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup (@RequestBody Signup request){
        try{
            return ResponseEntity.status(201).body(authService.signUpService(request));
        }catch(RuntimeException ex){
         return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login (@RequestBody Login request){
        try{
            return ResponseEntity.status(200).body("Access token : " + authService.logInService(request));
        }catch(RuntimeException e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
