package com.meetspace.meetspace_backend.dto.websocket;

import java.util.List;

import com.meetspace.meetspace_backend.dto.meeting.ParticipantResponse;
import com.meetspace.meetspace_backend.enums.websocket.MeetingMessageType;

/**
 * A full roster snapshot, sent to one client as it joins. Everything after this
 * arrives as USER_JOINED / USER_LEFT deltas on the meeting topic.
 */
public record ParticipantListMessage (MeetingMessageType type,String meetingCode,List<ParticipantResponse> participants){

}
