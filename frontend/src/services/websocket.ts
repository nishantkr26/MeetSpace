import { Client } from "@stomp/stompjs";
const wsUrl = import.meta.env.VITE_WS_URL;


/** Mirrors the backend record `dto.WebSocket.MeetingMessage`. */
export interface MeetingMessage {
    type: "USER_JOINED" | "USER_LEFT";
    userId: number;
    email: string;
    userName: string;
    meetingCode: string;
}

/** Mirrors the backend record `dto.WebSocket.ParticipantListMessage`. */
export interface ParticipantListMessage {
    type: "PARTICIPANT_LIST";
    meetingCode: string;
    participants: { userId: number; userName: string }[];
}

export interface WebRTCSignalMessage {
    type:"OFFER" | "ANSWER" | "ICE_CANDIDATE";
    meetingCode : string;
    fromUserId: number;
    toUserId: number;
    data: unknown;

}

let client: Client | null = null;

export const connectWebSocket = (onConnect: () => void) => {
    // The backend authenticates the STOMP CONNECT frame, not the HTTP handshake,
    // so the bearer token rides along in the connect headers. Without one the
    // server closes the connection, and reconnectDelay would retry it forever —
    // so don't start at all.
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("No auth token; not connecting WebSocket");
        return;
    }

    client = new Client({
        brokerURL: wsUrl, reconnectDelay: 5000,
        connectHeaders: { Authorization: `Bearer ${token}` },
        onConnect: () => {
            console.log("WebSocket Connected");
            onConnect();
        },
        onDisconnect: () => {
            console.log("WebSocket disconnected");
        },
        onStompError: (frame) => {
            console.error(
                "STOMP error",
                frame.headers["message"]
            )
        }
    });

    client.activate();
}

export const disconnectWebSocket = () => {
    if(client){
        client.deactivate();
        client = null;
    }
}

export const subscribeMeeting = (meetingCode: string, callback: (message: MeetingMessage) => void) => {
    if(!client?.connected){
        console.error("WebSocket is not connected");
        return;
    }

    return client.subscribe(
        `/topic/meeting/${meetingCode}`,
        (message) => {
            const data = JSON.parse(message.body);
            callback(data);
        }
    )

}

/**
 * The roster snapshot the server sends to this client alone when it joins.
 * `/user` is rewritten per STOMP session, so each client gets only its own.
 */
export const subscribeParticipantList = (callback: (message: ParticipantListMessage) => void) => {
    if(!client?.connected){
        console.error("WebSocket is not connected");
        return;
    }

    return client.subscribe(
        "/user/queue/participants",
        (message) => {
            const data = JSON.parse(message.body);
            callback(data);
        }
    )

}

// Only the meeting code is sent. Who we are is taken from the JWT on the STOMP
// session, and the event type from which endpoint was hit — the server rebuilds
// both rather than trusting a payload, so anything else we put here is ignored.
export const sendJoinEvent = (meetingCode:string) => {
    if(!client?.connected){
        console.error("Websocket is not connected");
        return;
    }
    client.publish({
        destination : "/app/meeting.join",
        body : JSON.stringify({ meetingCode })
    })
}

export const sendLeaveEvent= (meetingCode: string) => {
    if(!client?.connected){
        console.error("WebSocket is not connected");
        return;
    }

    client.publish ( {
        destination : "/app/meeting.leave",
        body : JSON.stringify({ meetingCode })
    })
}

/**
 * Offers, answers and ICE candidates addressed to this user alone. The server
 * resolves `/user` against the session's Principal, so each client only ever
 * sees the signals meant for it.
 */
export const subscribeToWebRTCSignals = (callback : (message: WebRTCSignalMessage) => void) => {
    if(!client?.connected){
        console.error("WebSocket is not connected");
        return;
    }
    return client.subscribe("/user/queue/webrtc",(message) => {
        const data = JSON.parse(message.body);
        callback(data);
    })
}

// `fromUserId` is sent for symmetry but the server overwrites it from the
// authenticated session — a client cannot sign a signal as somebody else.
export const sendRTCSignal = (signal:WebRTCSignalMessage) => {
    if(!client?.connected){
        console.error("WebSocket is not connected");
        return;
    }

    client.publish({
        destination:"/app/webrtc.signal",
        body:JSON.stringify(signal)
    });
};