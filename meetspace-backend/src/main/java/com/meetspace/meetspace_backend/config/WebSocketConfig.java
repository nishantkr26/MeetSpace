package com.meetspace.meetspace_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.meetspace.meetspace_backend.security.WebSocketAuthInterceptor;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config){
        // /topic is the shared broadcast namespace; /queue backs the per-session
        // destinations behind /user, which is how the roster snapshot reaches
        // only the client that just joined.
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry){
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
    }

    /**
     * Every frame a client sends passes through this channel. The interceptor
     * authenticates the CONNECT frame and rejects the connection without a valid
     * token; the servlet chain cannot do it, since it only sees the handshake.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration){
        registration.interceptors(webSocketAuthInterceptor);
    }
}
