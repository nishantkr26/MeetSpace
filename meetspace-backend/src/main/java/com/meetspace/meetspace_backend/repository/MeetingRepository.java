package com.meetspace.meetspace_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.meetspace.meetspace_backend.entity.Meeting;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting,Long> {
   
    Optional<Meeting> findByMeetingCode(String meetingCode);

    List<Meeting> findByHost_Email(String email);
}
