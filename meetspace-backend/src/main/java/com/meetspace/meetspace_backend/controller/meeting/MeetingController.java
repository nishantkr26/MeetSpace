package com.meetspace.meetspace_backend.controller.meeting;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.meetspace.meetspace_backend.dto.meeting.LeaveMeetingResponse;
import com.meetspace.meetspace_backend.dto.meeting.MeetingDTO.CreateMeeting;
import com.meetspace.meetspace_backend.dto.meeting.MeetingDTO.EndMeetingResponse;
import com.meetspace.meetspace_backend.dto.meeting.MeetingDTO.MeetingResponse;
import com.meetspace.meetspace_backend.dto.meeting.ParticipantResponse;
import com.meetspace.meetspace_backend.service.MeetingService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/meeting")
@SecurityRequirement(name = "bearerAuth")
public class MeetingController {
    private final MeetingService meetingService;

    @PostMapping
    public ResponseEntity<MeetingResponse> createMeeting(@RequestBody CreateMeeting request) {
        return ResponseEntity.status(201).body(meetingService.createMeetingService(request));
    }

    @GetMapping("/{meetingCode}")
    public ResponseEntity<MeetingResponse> getMeeting(@PathVariable String meetingCode) {
        return ResponseEntity.ok(meetingService.getMeeting(meetingCode));
    }

    @GetMapping("/my")
    public ResponseEntity<List<MeetingResponse>> getAllMeetings() {
        return ResponseEntity.ok(meetingService.getAllMeetings());
    }

    @GetMapping("/{meetingCode}/participants")
    public ResponseEntity<List<ParticipantResponse>> getParticipants(@PathVariable String meetingCode) {
        return ResponseEntity.ok(meetingService.getParticipants(meetingCode));
    }

    @PostMapping("/{meetingCode}/join")
    public ResponseEntity<?> joinMeeting(@PathVariable String meetingCode) {
        return ResponseEntity.ok(meetingService.joinMeetings(meetingCode));
    }

    @PostMapping("/{meetingCode}/start")
    public ResponseEntity<MeetingResponse> startMeeting(@PathVariable String meetingCode) {
        return ResponseEntity.ok(meetingService.startMeeting(meetingCode));
    }

    @PostMapping("/{meetingCode}/leave")
    public ResponseEntity<LeaveMeetingResponse> leaveMeeting(@PathVariable String meetingCode) {
        return ResponseEntity.ok(meetingService.leaveMeeting(meetingCode));
    }

    @PostMapping("/{meetingCode}/end")
    public ResponseEntity<EndMeetingResponse> endMeeting(@PathVariable String meetingCode) {
        return ResponseEntity.ok(meetingService.endMeeting(meetingCode));
    }

    
}
