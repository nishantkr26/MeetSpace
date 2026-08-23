package com.meetspace.meetspace_backend.dto.meeting;

import java.time.LocalDateTime;

import com.meetspace.meetspace_backend.enums.ParticipantStatus;

public record LeaveMeetingResponse(Long participantId,Long meetingId,String meetingCode,String meetingTitle,Long userId,String username,ParticipantStatus status,LocalDateTime leaveAt){

}