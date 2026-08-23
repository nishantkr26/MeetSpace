package com.meetspace.meetspace_backend.dto.meeting;

import java.time.LocalDateTime;

import com.meetspace.meetspace_backend.enums.MeetingStatus;

public class MeetingDTO {
    public record CreateMeeting(String title) {
    }

    public record MeetingResponse (Long id, String meetingCode,String title,Long hostId,String hostName,MeetingStatus status,LocalDateTime createdAt,LocalDateTime startedAt){
        
    }

     public record EndMeetingResponse (Long id, String meetingCode,String title,Long hostId,String hostName,MeetingStatus status,LocalDateTime createdAt,LocalDateTime startedAt,LocalDateTime endedAt){
        
    }

}
