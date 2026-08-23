package com.meetspace.meetspace_backend.controller.websocket;

import java.security.Principal;

import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.stereotype.Controller;

import com.meetspace.meetspace_backend.dto.meeting.ParticipantResponse;
import com.meetspace.meetspace_backend.dto.websocket.MeetingMessage;
import com.meetspace.meetspace_backend.dto.websocket.ParticipantListMessage;
import com.meetspace.meetspace_backend.enums.websocket.MeetingMessageType;
import com.meetspace.meetspace_backend.service.MeetingService;

import lombok.RequiredArgsConstructor;

import org.springframework.messaging.simp.SimpMessagingTemplate;


@Controller
@RequiredArgsConstructor
public class MeetingWebSocketController {
    private final SimpMessagingTemplate messagingTemplate;
    private final MeetingService meetingService;

    @MessageMapping("/meeting.join")
    public void joinMeeting(MeetingMessage message, Principal principal, SimpMessageHeaderAccessor accessor){
        MeetingMessage announcement = fromSession(MeetingMessageType.USER_JOINED, message, principal);

        // Tell the room someone arrived.
        messagingTemplate.convertAndSend("/topic/meeting/"+announcement.meetingCode(),announcement);

        // Then hand the newcomer the roster it could not have seen: everything
        // announced before it subscribed. The snapshot is read from the database,
        // where the REST join has already recorded this user, so it includes them.
        ParticipantListMessage participantList = new ParticipantListMessage(
                MeetingMessageType.PARTICIPANT_LIST,
                announcement.meetingCode(),
                meetingService.getParticipants(announcement.meetingCode()));

        String sessionId = accessor.getSessionId();
        messagingTemplate.convertAndSendToUser(
                sessionId,
                "/queue/participants",
                participantList,
                sessionHeaders(sessionId));
    }

    @MessageMapping("/meeting.leave")
    public void leaveMeeting(MeetingMessage message, Principal principal){
        MeetingMessage announcement = fromSession(MeetingMessageType.USER_LEFT, message, principal);
        messagingTemplate.convertAndSend("/topic/meeting/"+announcement.meetingCode(),announcement);
    }

    /**
     * Rebuilds the announcement from the session's own identity. The client chooses
     * which meeting it is talking about and nothing else: the id, email, display name
     * and event type it claims are all discarded in favour of what the server knows,
     * so a connection cannot announce itself as somebody else. Which handler ran
     * determines the type, since only the server can be trusted about that too.
     */
    private MeetingMessage fromSession(MeetingMessageType type, MeetingMessage message, Principal principal){
        if(principal == null){
            // WebSocketAuthInterceptor rejects unauthenticated CONNECTs, so this is a
            // guard against the interceptor being unregistered, not an expected path.
            throw new IllegalArgumentException("Unauthenticated session");
        }

        String email = principal.getName();
        ParticipantResponse identity = meetingService.getIdentity(email);

        return new MeetingMessage(
                type,
                identity.userId(),
                email,
                identity.userName(),
                message.meetingCode());
    }

    /**
     * Addresses one STOMP session directly. Spring's user destinations normally
     * key off an authenticated Principal; there is none here, so the session id
     * stands in for the user name and has to be echoed in the headers for the
     * resolver to match it.
     */
    private MessageHeaders sessionHeaders(String sessionId){
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        headerAccessor.setSessionId(sessionId);
        headerAccessor.setLeaveMutable(true);
        return headerAccessor.getMessageHeaders();
    }

}
