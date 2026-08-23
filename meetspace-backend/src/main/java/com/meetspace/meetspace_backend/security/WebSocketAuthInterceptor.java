package com.meetspace.meetspace_backend.security;

import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;


/**
 * The WebSocket counterpart to AuthenticationFilter. A servlet filter only sees the
 * HTTP handshake, never the STOMP frames that follow, so the bearer token is checked
 * here instead — on CONNECT, the one frame that opens a session.
 *
 * The Principal set here is remembered for the life of the session, so later frames
 * carry no credentials of their own.
 */
// @Component so Spring builds one and injects JWTUtil. Being a bean is not enough to
// make it run, though — nothing calls a ChannelInterceptor until it is registered on
// a channel, which WebSocketConfig.configureClientInboundChannel does.
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JWTUtil jwtUtil;

    // Constructor injection: one constructor, so no @Autowired needed.
    public WebSocketAuthInterceptor(JWTUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    /**
     * Runs on every message travelling through the channel this interceptor is
     * registered on — here the <em>client inbound</em> channel, so: every STOMP frame
     * any browser sends. CONNECT, SUBSCRIBE, SEND, DISCONNECT, all of them.
     *
     * Whatever this returns is what continues down the channel. Returning null would
     * silently drop the frame; throwing aborts it loudly (see below).
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        // A Message's headers are immutable by default. Spring's inbound STOMP messages
        // are the exception: they are built with mutable headers, and getAccessor hands
        // back the *live* accessor sitting on them, so writes through it are seen by
        // everything downstream.
        //
        // StompHeaderAccessor.wrap(message) would compile and look identical, but it
        // constructs a fresh copy of the headers. setUser() at the bottom would then
        // write to that copy, and `return message` would hand back the untouched
        // original — authentication would appear to work and silently do nothing.
        // getAccessor returns null if the headers were not mutable, hence the check.
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // Only CONNECT carries credentials, and only CONNECT needs to: it is the frame
        // that opens the session. Spring remembers the user attached below for the
        // session's lifetime and stamps it onto every later frame, so SUBSCRIBE and SEND
        // arrive already authenticated. Letting them through untouched is not a hole.
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        // "Native" headers are the ones literally written into the STOMP frame by the
        // client, as opposed to Spring's own internal headers (simpSessionId,
        // simpDestination, ...). The token is client-supplied, so it is native.
        // "First" because STOMP permits a header name to repeat.
        String authorizationHeader = accessor.getFirstNativeHeader("Authorization");

        // Throwing aborts the send: the frame never reaches the broker, Spring's STOMP
        // handler catches this, returns an ERROR frame to the browser and closes the
        // connection. That is what makes the socket genuinely closed to unauthenticated
        // clients rather than merely unidentified.
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing Authorization Header");
        }

        // Strip the "Bearer " prefix — 7 characters, trailing space included.
        String token = authorizationHeader.substring(7);

        // validateToken parses the token inside a try/catch and returns false on any
        // failure. That one call covers a forged signature, a malformed token, and an
        // expired one (parsing throws ExpiredJwtException) — which is why there is no
        // separate expiry check here.
        if (!jwtUtil.validateToken(token)) {
            throw new IllegalArgumentException("Invalid JWT");
        }

        // The token's subject. Safe to read now: validateToken already proved the
        // signature, so this value came from us and has not been tampered with.
        String email = jwtUtil.getEmailFromToken(token);

        // The Principal for this session — the same shape AuthenticationFilter builds
        // for HTTP requests. Credentials are null (the password is not ours to hold and
        // is not needed again); authorities are a fixed ROLE_USER, as this app has no
        // roles yet.
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                email, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        // The payoff: this is what gives the session an identity, the thing the
        // WebSocket previously had no way to know. From here on, handler methods can
        // take a Principal parameter and /user destinations can address a person
        // rather than a raw session id.
        accessor.setUser(authentication);

        // Pass the frame along, now carrying a user.
        return message;
    }
}
