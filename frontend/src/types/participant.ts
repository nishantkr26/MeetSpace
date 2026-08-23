/**
 * Someone present in a meeting, as tracked by the client.
 *
 * Deliberately separate from the `MeetingMessage` that arrives on the socket:
 * that is a wire event ("X joined"), this is the state it produces ("X is
 * here"). Phase 6 hangs the WebRTC peer connection off `userId`.
 */
export interface Participant {
    userId: number;
    userName: string;
}
