import type { Participant } from '../types/participant';

const API_BASE_URL = 'http://localhost:8080';

interface AuthResponse {
  token: string;
  email: string;
  userId: number;
  name: string;
}

interface Meeting {
  id: number;
  meetingCode: string;
  title: string;
  hostId: number;
  hostName: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  createdAt: string;
  startedAt: string | null;
}

interface MeetingResponse {
  id: number;
  meetingCode: string;
  title: string;
  hostId: number;
  hostName: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
}

interface EndMeetingResponse extends MeetingResponse {
  endedAt: string | null;
}

interface JoinMeetingResponse {
  participantId: number;
  meetingId: number;
  meetingCode: string;
  meetingTitle: string;
  userId: number;
  username: string;
  status: string;
  joinedAt: string;
}

interface LeaveMeetingResponse {
  participantId: number;
  meetingId: number;
  meetingCode: string;
  meetingTitle: string;
  userId: number;
  username: string;
  status: string;
  leftAt: string;
}

class API {
  private getToken() {
    return localStorage.getItem('token');
  }

  private getHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  // Auth
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  }

  // Meetings
  async createMeeting(title: string): Promise<Meeting> {
    const response = await fetch(`${API_BASE_URL}/meeting`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error('Failed to create meeting');
    return response.json();
  }

  async getMeeting(meetingCode: string): Promise<MeetingResponse> {
    const response = await fetch(`${API_BASE_URL}/meeting/${meetingCode}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch meeting');
    return response.json();
  }

  async getAllMeetings(): Promise<MeetingResponse[]> {
    const response = await fetch(`${API_BASE_URL}/meeting/my`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch meetings');
    return response.json();
  }

  async getParticipants(meetingCode: string): Promise<Participant[]> {
    const response = await fetch(`${API_BASE_URL}/meeting/${meetingCode}/participants`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch participants');
    return response.json();
  }

  async joinMeeting(meetingCode: string): Promise<JoinMeetingResponse> {
    const response = await fetch(`${API_BASE_URL}/meeting/${meetingCode}/join`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to join meeting');
    return response.json();
  }

  async startMeeting(meetingCode: string): Promise<MeetingResponse> {
    const response = await fetch(`${API_BASE_URL}/meeting/${meetingCode}/start`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to start meeting');
    return response.json();
  }

  async leaveMeeting(meetingCode: string): Promise<LeaveMeetingResponse> {
    const response = await fetch(`${API_BASE_URL}/meeting/${meetingCode}/leave`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to leave meeting');
    return response.json();
  }

  async endMeeting(meetingCode: string): Promise<EndMeetingResponse> {
    const response = await fetch(`${API_BASE_URL}/meeting/${meetingCode}/end`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to end meeting');
    return response.json();
  }
}

export const api = new API();
export type { Meeting, MeetingResponse, JoinMeetingResponse, LeaveMeetingResponse, EndMeetingResponse };
