package com.meetspace.meetspace_backend.dto.meeting;

/** One person currently in a meeting. Mirrors the frontend `Participant` type. */
public record ParticipantResponse (Long userId,String userName){

}
