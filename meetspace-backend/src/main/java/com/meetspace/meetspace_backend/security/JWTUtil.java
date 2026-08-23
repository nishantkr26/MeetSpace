package com.meetspace.meetspace_backend.security;

import java.nio.charset.StandardCharsets;
import java.security.Key;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JWTUtil {

    private final Key key;

    private final long expirationTime;

    public JWTUtil(@Value("${jwt.secret}") String secretString, @Value("${jwt.expiration}") long expirationTime){
        this.key = Keys.hmacShaKeyFor(secretString.getBytes(StandardCharsets.UTF_8));
        this.expirationTime = expirationTime;
    }

    public Boolean validateToken(String token){
        try{
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().getSubject();
            return true;
        }catch(Exception e){
            return false;
        }
    }

    public String getEmailFromToken(String token){
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().getSubject();
    }

    public String generateToken(String email){
        return Jwts.builder().setSubject(email).setExpiration(new java.util.Date(System.currentTimeMillis() + expirationTime)).signWith(key).compact();
    }

}
