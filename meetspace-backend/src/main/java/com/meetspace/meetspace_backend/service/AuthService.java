package com.meetspace.meetspace_backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.meetspace.meetspace_backend.dto.auth.AuthRequest;
import com.meetspace.meetspace_backend.dto.auth.AuthRequest.Login;
import com.meetspace.meetspace_backend.dto.auth.AuthRequest.Signup;
import com.meetspace.meetspace_backend.dto.auth.AuthResponse;
import com.meetspace.meetspace_backend.entity.User;
import com.meetspace.meetspace_backend.repository.UserRepository;
import com.meetspace.meetspace_backend.security.JWTUtil;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;
    private final JWTUtil jwtUtil;

    public AuthResponse signUpService(Signup request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new RuntimeException("User already registered, please log in");
        }
        User user = User.builder()
                .name(request.name())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .build();

        // Keep the persisted entity — the generated id is only on the return value.
        User saved = userRepository.save(user);

        String token = jwtUtil.generateToken(request.email());
        return new AuthResponse(token, saved.getEmail(), saved.getId(), saved.getName());
    }

    public AuthResponse logInService(Login request) {
        if (!userRepository.existsByEmail(request.email())) {
            throw new RuntimeException("No user registered with this email, please sign up first");
        }
        User user = userRepository.findByEmail(request.email()).orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new RuntimeException("Wrong password, please try with a different password");
        }

        String token = jwtUtil.generateToken(request.email());
        return new AuthResponse(token, user.getEmail(), user.getId(), user.getName());
    }
}
