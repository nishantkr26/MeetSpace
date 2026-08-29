package com.meetspace.meetspace_backend.dto.websocket;

import com.meetspace.meetspace_backend.enums.websocket.WebRTCSignalType;

public record WebRTCSignalMessage(WebRTCSignalType type,String meetingCode,Long fromUserId,Long toUserId,Object data) {
    
}
