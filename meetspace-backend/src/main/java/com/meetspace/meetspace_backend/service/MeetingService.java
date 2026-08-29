package com.meetspace.meetspace_backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.meetspace.meetspace_backend.dto.meeting.JoinMeetingResponse;
import com.meetspace.meetspace_backend.dto.meeting.LeaveMeetingResponse;
import com.meetspace.meetspace_backend.dto.meeting.ParticipantResponse;
import com.meetspace.meetspace_backend.dto.meeting.MeetingDTO.CreateMeeting;
import com.meetspace.meetspace_backend.dto.meeting.MeetingDTO.EndMeetingResponse;
import com.meetspace.meetspace_backend.dto.meeting.MeetingDTO.MeetingResponse;
import com.meetspace.meetspace_backend.entity.Meeting;
import com.meetspace.meetspace_backend.entity.MeetingParticipant;
import com.meetspace.meetspace_backend.entity.User;
import com.meetspace.meetspace_backend.enums.MeetingStatus;
import com.meetspace.meetspace_backend.enums.ParticipantStatus;
import com.meetspace.meetspace_backend.repository.MeetingParticipantRepository;
import com.meetspace.meetspace_backend.repository.MeetingRepository;
import com.meetspace.meetspace_backend.repository.UserRepository;
import com.meetspace.meetspace_backend.util.MeetingCodeGenerator;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MeetingService {
    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;
    private final MeetingCodeGenerator meetingCodeGenerator;
    private final MeetingParticipantRepository meetingParticipantRepository;

    /**
     * The one shape every meeting endpoint hands back. Returning the entity instead
     * leaks a lazily-loaded `host` relation and no `hostName` at all, which the
     * client has no way to render — so nothing here returns a Meeting.
     */
    private MeetingResponse toResponse(Meeting meeting) {
        return new MeetingResponse(
                meeting.getId(),
                meeting.getMeetingCode(),
                meeting.getTitle(),
                meeting.getHost().getId(),
                meeting.getHost().getName(),
                meeting.getStatus(),
                meeting.getCreatedAt(),
                meeting.getStartedAt());
    }

    public MeetingResponse createMeetingService(CreateMeeting request) {
        String email = getAuthenticatedUserEmail();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));

        Meeting meeting = Meeting.builder()
                .meetingCode(meetingCodeGenerator.generate())
                .title(request.title())
                .host(user)
                .status(MeetingStatus.SCHEDULED)
                .build();

        return toResponse(meetingRepository.save(meeting));
    }

    public MeetingResponse getMeeting(String meetingCode) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        return toResponse(meeting);
    }

    public List<MeetingResponse> getAllMeetings() {
        String email = getAuthenticatedUserEmail();
        List<Meeting> meetings = meetingRepository.findByHost_Email(email);
        return meetings.stream().map(this::toResponse).toList();
    }

    /** Who is in the meeting right now — seeds the client roster before any websocket event lands. */
    @Transactional(readOnly = true)
    public List<ParticipantResponse> getParticipants(String meetingCode) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        return meetingParticipantRepository
                .findByMeetingIdAndStatus(meeting.getId(), ParticipantStatus.JOINED)
                .stream()
                .map(participant -> new ParticipantResponse(
                        participant.getUser().getId(),
                        participant.getUser().getName()))
                .toList();
    }

    /**
     * The identity behind an authenticated STOMP session. A websocket handler gets an
     * email off the Principal and nothing else, so the id and display name have to be
     * looked up here rather than taken from whatever the client put in its payload.
     */
    @Transactional(readOnly = true)
    public ParticipantResponse getIdentity(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Unable to find user"));

        return new ParticipantResponse(user.getId(), user.getName());
    }

    public JoinMeetingResponse joinMeetings(String meetingCode) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new RuntimeException("Unable to find the meeting"));
        String email = getAuthenticatedUserEmail();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Unable to find user"));

        MeetingParticipant meetingParticipant = meetingParticipantRepository
                .findByMeeting_MeetingCodeAndUserId(meetingCode, user.getId());

        if (meetingParticipant == null) {
            meetingParticipant = MeetingParticipant.builder()
                    .meeting(meeting)
                    .user(user)
                    .joinedAt(LocalDateTime.now())
                    .status(ParticipantStatus.JOINED)
                    .build();
        } else if (meetingParticipant.getStatus() == ParticipantStatus.JOINED) {
            throw new RuntimeException("User already joined this meeting");
        } else {
            // Someone who left can come back — reuse their row rather than
            // refusing, which is what a row existing at all used to mean.
            meetingParticipant.setStatus(ParticipantStatus.JOINED);
            meetingParticipant.setJoinedAt(LocalDateTime.now());
            meetingParticipant.setLeftAt(null);
        }

        meetingParticipant = meetingParticipantRepository.save(meetingParticipant);

        return new JoinMeetingResponse(
                meetingParticipant.getId(),
                meeting.getId(),
                meeting.getMeetingCode(),
                meeting.getTitle(),
                user.getId(),
                user.getName(),
                meetingParticipant.getStatus(),
                meetingParticipant.getJoinedAt());

    }

    public LeaveMeetingResponse leaveMeeting(String meetingCode) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new RuntimeException("Unable to find the meeting"));
        String email = getAuthenticatedUserEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Unable to find user"));

        boolean alreadyJoined = meetingParticipantRepository.existsByMeetingIdAndUserId(meeting.getId(), user.getId());
        if (!alreadyJoined) {
            throw new RuntimeException("User is not in this meeting");
        }

        MeetingParticipant meetingParticipant = meetingParticipantRepository
                .findByMeeting_MeetingCodeAndUserId(meetingCode, user.getId());

        if (meetingParticipant.getStatus() == ParticipantStatus.LEFT) {
            throw new RuntimeException("User already left");
        }

        meetingParticipant.setLeftAt(LocalDateTime.now());
        meetingParticipant.setStatus(ParticipantStatus.LEFT);

        meetingParticipant = meetingParticipantRepository.save(meetingParticipant);

        return new LeaveMeetingResponse(
                meetingParticipant.getId(),
                meeting.getId(),
                meeting.getMeetingCode(),
                meeting.getTitle(),
                user.getId(),
                user.getName(),
                meetingParticipant.getStatus(),
                meetingParticipant.getLeftAt());
    }

    public MeetingResponse startMeeting(String meetingCode) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new RuntimeException("Unable to find the meeting"));

        if (meeting.getStatus() == MeetingStatus.LIVE) {
            throw new RuntimeException("Meeting already started");
        }

        if (meeting.getStatus() == MeetingStatus.ENDED) {
            throw new RuntimeException("Meeting already ended");
        }
        String email = getAuthenticatedUserEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Host not found"));

        if (meeting.getHost().getId() != user.getId()) {
            throw new RuntimeException("User is not host of this meeting");
        }

        meeting.setStatus(MeetingStatus.LIVE);
        meeting.setStartedAt(LocalDateTime.now());
        meeting = meetingRepository.save(meeting);

        return toResponse(meeting);
    }

    public EndMeetingResponse endMeeting(String meetingCode) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new RuntimeException("Unable to find the meeting"));

        if (meeting.getStatus() == MeetingStatus.ENDED) {
            throw new RuntimeException("Meeting already ended");
        }

        String email = getAuthenticatedUserEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Host not found"));

        if (meeting.getHost().getId() != user.getId()) {
            throw new RuntimeException("User is not host of this meeting");
        }

        meeting.setStatus(MeetingStatus.ENDED);
        meeting.setEndedAt(LocalDateTime.now());
        meeting = meetingRepository.save(meeting);

        return new EndMeetingResponse(
                meeting.getId(),
                meeting.getMeetingCode(),
                meeting.getTitle(),
                meeting.getHost().getId(),
                meeting.getHost().getName(),
                meeting.getStatus(),
                meeting.getCreatedAt(),
                meeting.getStartedAt(),
                meeting.getEndedAt());
    }

    @Transactional(readOnly = true)
    public String getEmailByUserId(Long userId){
        return userRepository.findById(userId).map(User::getEmail).orElseThrow(() ->  new RuntimeException("Unable to find the user"));
    }


    private String getAuthenticatedUserEmail() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal == null) {
            throw new RuntimeException("User not authenticated");
        }
        return (String) principal;
    }
}
