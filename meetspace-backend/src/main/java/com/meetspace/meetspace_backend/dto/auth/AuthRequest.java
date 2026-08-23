package com.meetspace.meetspace_backend.dto.auth;

public class AuthRequest{
    public record Signup (String name,String email,String password) {}

    public record Login (String email,String password){}
}
