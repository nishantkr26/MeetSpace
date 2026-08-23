package com.meetspace.meetspace_backend.entity;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.meetspace.meetspace_backend.enums.ParticipantStatus;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Table(name = "meeting_participant")
@Entity
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MeetingParticipant {

    @Id
    @GeneratedValue(strategy =  GenerationType.IDENTITY)
    private long id;
    @ManyToOne(fetch  = FetchType.LAZY)
    @JoinColumn(name = "meeting_id",nullable = false)
    private Meeting meeting;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;

    @Enumerated(EnumType.STRING)
    private ParticipantStatus status;

}
