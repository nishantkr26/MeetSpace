package com.meetspace.meetspace_backend.services;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.meetspace.meetspace_backend.dto.AuthRequest;
import com.meetspace.meetspace_backend.dto.AuthRequest.Login;
import com.meetspace.meetspace_backend.dto.AuthRequest.Signup;
import com.meetspace.meetspace_backend.entity.User;
import com.meetspace.meetspace_backend.repository.UserRepository;
import com.meetspace.meetspace_backend.utils.JWTUtil;

import lombok.RequiredArgsConstructor;


@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;
private final JWTUtil jwtUtil;
    public String signUpService (Signup request){
        if(userRepository.existsByEmail(request.email())){
            return "User already registered ! Please Log in";
        }
        User user = User.builder()
            .name(request.name())
            .email(request.email())
            .password(passwordEncoder.encode(request.password()))
            .build();

        userRepository.save(user);
        
        return "user created successfully";
    }

    public String logInService (Login request){
        if(!userRepository.existsByEmail(request.email())){
            return "No user registered with this email , Please Signup first !";
        }
   User user = userRepository.findByEmail(request.email());

        if(!passwordEncoder.matches(request.password(),user.getPassword())){
            throw new RuntimeException("Wrong password , please try with a diffrent password");
        }else{
            String token = jwtUtil.generateToken(request.email());
            return token;
        }

    }
}
