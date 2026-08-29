export const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection({
        iceServers:[
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    })

    return peerConnection;
}

export const addLocalTracks = (peerConnection:RTCPeerConnection,stream:MediaStream) => {
    stream.getTracks().forEach((track) => {
        peerConnection.addTrack(
            track,stream
        )
    })
}

/**
 * Tears down one peer connection.
 *
 * Deliberately does *not* stop the sender tracks. Every peer here shares the one
 * local MediaStream, so stopping a sender's track would switch off the camera for
 * every other participant and for the local preview too. That stream is owned by
 * useMediaStream, which stops it on unmount — the only place it should be stopped.
 *
 * Handlers are detached first: a closing connection still fires a final
 * connectionstatechange, and letting it reach a React setState after the peer has
 * been dropped from the map just resurrects state for someone who is gone.
 */
export const closePeerConnection = (peerConnection: RTCPeerConnection) => {
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.close();
};