import { useCallback, useEffect, useRef, useState } from "react";
import { addLocalTracks, closePeerConnection, createPeerConnection } from "../services/webrtc";
import { sendRTCSignal, type WebRTCSignalMessage } from "../services/websocket";

/**
 * What we can infer about a remote participant's devices. There is no signalling
 * for "I muted myself", so this is read off the tracks: a track reports `muted`
 * when nothing is flowing through it, which is exactly what happens when the far
 * side sets `track.enabled = false`.
 */
export type RemoteMedia = { camOn: boolean; micOn: boolean };

export function useWebRTC(
    meetingCode: string,
    userId: number | null,
    localStream: MediaStream | null,
    /** The local getUserMedia attempt has finished — with a stream, or with a failure. */
    mediaSettled: boolean,
) {
    const peerRefs = useRef(new Map<number, RTCPeerConnection>());

    // Who we have already dialled. This lives beside `peerRefs` rather than in the
    // component precisely so the two cannot drift apart: a remount that clears the
    // peer map while an outer ref still said "already called" left the far side
    // answering a connection that no longer existed.
    const dialledRef = useRef(new Set<number>());

    // Candidates that arrived before the description they belong to. Buffering
    // them is standard trickle-ICE practice: addIceCandidate throws outright on a
    // null remote description, and a dropped candidate can cost you the route
    // that would have connected.
    const pendingCandidates = useRef(new Map<number, RTCIceCandidateInit[]>());

    const [remoteStreams, setRemoteStreams] = useState(new Map<number, MediaStream>());
    const [remoteMedia, setRemoteMedia] = useState(new Map<number, RemoteMedia>());
    const [peerStates, setPeerStates] = useState(new Map<number, RTCPeerConnectionState>());

    const streamRef = useRef(localStream);

    useEffect(() => {
        streamRef.current = localStream;
    }, [localStream]);

    // Tracks are only added when a peer connection is built, and nothing adds them
    // afterwards. A signal that arrives before the camera is ready would therefore
    // produce a connection that negotiates successfully and carries no media — the
    // far side sees a permanently black tile with no error anywhere. So incoming
    // signals wait here instead.
    //
    // The gate opens on failure too, not just on success: someone who denied their
    // camera should still be able to watch and hear everyone else.
    // Built by useState's lazy initialiser rather than a ref, so it is created
    // exactly once without being written during render.
    const [gate] = useState(() => {
        let open!: () => void;
        const promise = new Promise<void>((resolve) => { open = resolve; });
        return { promise, open };
    });

    useEffect(() => {
        if (mediaSettled) gate.open();
    }, [gate, mediaSettled]);

    const patchRemoteMedia = useCallback((remoteUserId: number, patch: Partial<RemoteMedia>) => {
        setRemoteMedia((m) => new Map(m).set(remoteUserId, {
            camOn: false,
            micOn: false,
            ...m.get(remoteUserId),
            ...patch,
        }));
    }, []);

    const getPeer = useCallback((remoteUserId: number) => {
        const existing = peerRefs.current.get(remoteUserId);
        if (existing) {
            return existing;
        }

        const pc = createPeerConnection();

        // Registered before any track is added and before any SDP is exchanged.
        // ontrack fires as soon as the remote description lands, so a handler
        // attached later — after the offer, say — would miss the event entirely.
        pc.ontrack = (e) => {
            console.log(`[webrtc] peer ${remoteUserId}: received ${e.track.kind} track`);

            // Take the sender's own stream. Both tracks were added against a single
            // MediaStream, so this same object arrives on the audio and the video
            // event alike — assign it once and it already carries both.
            //
            // Building our own stream from whichever track landed first does not
            // work: audio arrives first, and a video track added to a MediaStream
            // that is already a <video>'s srcObject never starts rendering. That is
            // a black tile with a perfectly healthy connection behind it.
            const [stream] = e.streams;
            if (stream) {
                // Renegotiation hands over a different object; anything else is the
                // same stream again and re-setting it would restart playback.
                setRemoteStreams(m => (m.get(remoteUserId) === stream
                    ? m
                    : new Map(m).set(remoteUserId, stream)));
            }

            // Assume a track we have been handed is live. Seeding this from
            // `track.muted` reads as more correct and is much worse in practice: a
            // remote track is muted until the first packet lands, so if `unmute`
            // fires in the gap before the listener below is attached, no event
            // ever arrives and the tile stays hidden over a working stream.
            //
            // The cost of being optimistic is a black tile for the moment before
            // the first frame, and for a peer whose camera was already off when we
            // negotiated. Both are better than invisible video.
            const key = e.track.kind === "video" ? "camOn" : "micOn";
            const set = (on: boolean, why: string) => {
                console.log(`[webrtc] peer ${remoteUserId}: ${e.track.kind} ${why} -> ${key}=${on}`);
                patchRemoteMedia(remoteUserId, { [key]: on });
            };
            set(true, "attached");
            e.track.onunmute = () => set(true, "unmuted");
            e.track.onmute = () => set(false, "muted");
            e.track.onended = () => set(false, "ended");
        };

        pc.onconnectionstatechange = () => {
            console.log(`[webrtc] peer ${remoteUserId}: ${pc.connectionState}`);
            setPeerStates(m => new Map(m).set(remoteUserId, pc.connectionState));
        };

        if (streamRef.current) {
            addLocalTracks(pc, streamRef.current);
        } else {
            // Should be unreachable: the gate holds incoming signals until media
            // has settled, and callPeer only runs once there is a stream. If it
            // does happen the connection will negotiate and carry nothing, which
            // is invisible without this line.
            console.warn(`[webrtc] peer ${remoteUserId}: built with no local tracks`);
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && userId) {
                sendRTCSignal({
                    type: 'ICE_CANDIDATE',
                    meetingCode, fromUserId: userId, toUserId: remoteUserId, data: e.candidate,
                })
            }
        };

        peerRefs.current.set(remoteUserId, pc);
        return pc;

    }, [meetingCode, patchRemoteMedia, userId]);

    /** Drops one participant entirely: connection closed, tile removed. */
    const removePeer = useCallback((remoteUserId: number) => {
        const pc = peerRefs.current.get(remoteUserId);
        if (pc) {
            closePeerConnection(pc);
            peerRefs.current.delete(remoteUserId);
        }
        dialledRef.current.delete(remoteUserId);
        pendingCandidates.current.delete(remoteUserId);

        const without = <T,>(m: Map<number, T>) => {
            if (!m.has(remoteUserId)) return m;
            const next = new Map(m);
            next.delete(remoteUserId);
            return next;
        };

        setRemoteStreams(without);
        setRemoteMedia(without);
        setPeerStates(without);
    }, []);

    /** Applies whatever arrived early, now that there is a description to hang it on. */
    const flushCandidates = useCallback(async (remoteUserId: number, pc: RTCPeerConnection) => {
        const queued = pendingCandidates.current.get(remoteUserId);
        if (!queued?.length) return;
        pendingCandidates.current.delete(remoteUserId);
        for (const candidate of queued) {
            await pc.addIceCandidate(candidate)
                .catch((err) => console.error("Dropped buffered ICE candidate:", err));
        }
    }, []);

    const processSignal = useCallback(async (msg: WebRTCSignalMessage) => {
        const pc = getPeer(msg.fromUserId);

        if (msg.type === "OFFER") {
            await pc.setRemoteDescription(msg.data as RTCSessionDescriptionInit);
            await flushCandidates(msg.fromUserId, pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendRTCSignal({
                type: 'ANSWER', meetingCode, fromUserId: userId!, toUserId: msg.fromUserId, data: answer
            })
        } else if (msg.type === "ANSWER") {
            // An answer is only meaningful against an offer still outstanding. One
            // that arrives for a connection since torn down and rebuilt would throw
            // on a `stable` peer; drop it and let the fresh negotiation finish.
            if (pc.signalingState !== "have-local-offer") {
                console.warn("Ignoring stale answer from", msg.fromUserId, "in state", pc.signalingState);
                return;
            }
            await pc.setRemoteDescription(msg.data as RTCSessionDescriptionInit);
            await flushCandidates(msg.fromUserId, pc);
        } else {
            const candidate = msg.data as RTCIceCandidateInit;
            if (!pc.remoteDescription) {
                const queued = pendingCandidates.current.get(msg.fromUserId) ?? [];
                queued.push(candidate);
                pendingCandidates.current.set(msg.fromUserId, queued);
                return;
            }
            await pc.addIceCandidate(candidate);
        }
    }, [flushCandidates, getPeer, meetingCode, userId]);

    // Signals arrive in order — one STOMP connection, one broker — but stompjs does
    // not await the subscription callback, so frame 2 starts while frame 1 is still
    // mid-await. An ICE candidate reaching addIceCandidate before the offer's
    // setRemoteDescription has resolved throws InvalidStateError, and because
    // nothing awaits the callback it surfaces as an unhandled rejection with a
    // silently dropped candidate. Chaining each signal onto the previous one keeps
    // them strictly sequential; the catch stops one bad frame breaking the chain.
    const queueRef = useRef<Promise<void>>(Promise.resolve());

    const handleSignal = useCallback((msg: WebRTCSignalMessage) => {
        if (!userId) {
            return;
        }
        queueRef.current = queueRef.current
            .then(() => gate.promise)
            .then(() => processSignal(msg))
            .catch((err) => console.error("WebRTC signal failed:", msg.type, err));
    }, [gate, processSignal, userId]);

    // Idempotent: the caller can invite the whole roster on every roster change and
    // only the peers not yet dialled will actually be offered to. Marked before the
    // first await, so two calls in the same tick cannot both get through.
    const callPeer = useCallback(async (remoteUserId: number) => {
        if (!userId || dialledRef.current.has(remoteUserId)) return;
        dialledRef.current.add(remoteUserId);

        const pc = getPeer(remoteUserId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendRTCSignal({ type: 'OFFER', meetingCode, fromUserId: userId, toUserId: remoteUserId, data: offer });
    }, [getPeer, meetingCode, userId]);

    useEffect(() => {
        const peers = peerRefs.current;
        const dialled = dialledRef.current;
        const buffered = pendingCandidates.current;
        return () => {
            peers.forEach(closePeerConnection);
            peers.clear();
            // Cleared together with the connections they describe — that is the
            // whole point of them living here.
            dialled.clear();
            buffered.clear();
        };
    }, []);

    return { remoteStreams, remoteMedia, peerStates, handleSignal, callPeer, removePeer };
}
