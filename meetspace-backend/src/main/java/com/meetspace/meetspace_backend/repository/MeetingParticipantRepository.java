package com.meetspace.meetspace_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.meetspace.meetspace_backend.entity.MeetingParticipant;
import com.meetspace.meetspace_backend.enums.ParticipantStatus;

@Repository
public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant,Long> {
    List<MeetingParticipant> findByMeetingId(Long meetingId);

    List<MeetingParticipant> findByMeetingIdAndStatus(Long meetingId, ParticipantStatus status);

    boolean existsByMeetingIdAndUserId(Long meetingId, Long userId);

    MeetingParticipant findByMeeting_MeetingCodeAndUserId(String meetingCode, Long userId);
}
