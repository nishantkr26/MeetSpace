package com.meetspace.meetspace_backend.dto.websocket;

import com.meetspace.meetspace_backend.enums.websocket.MeetingMessageType;

public record MeetingMessage (MeetingMessageType type,Long userId,String email,String userName,String meetingCode){

}
