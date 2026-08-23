package com.meetspace.meetspace_backend.dto.common;

import java.time.LocalDateTime;

public record ErrorResponse(
        int status,
        String message,
        String error,
        LocalDateTime timestamp
) {
    public ErrorResponse(int status, String message, String error) {
        this(status, message, error, LocalDateTime.now());
    }
}
