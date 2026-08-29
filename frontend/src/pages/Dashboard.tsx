import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { MeetingResponse } from '../services/api';
import { Avatar, StatusPill } from '../components/ui';
import { Plus, Keypad, Video, Users } from '../components/icons';

export function Dashboard() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const email = localStorage.getItem('email') ?? '';

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const data = await api.getAllMeetings();
      setMeetings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const meeting = await api.createMeeting(newMeetingTitle);
      setMeetings([...meetings, meeting]);
      setNewMeetingTitle('');
      setShowCreateForm(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userId');
    localStorage.removeItem('name');
    navigate('/');
  };

  return (
    <div className="min-h-full">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="font-semibold tracking-tight truncate">Meetspace</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-ink-muted hidden sm:block truncate max-w-[16rem]">
              {email}
            </span>
            <button onClick={handleLogout} className="btn-ghost text-sm">
              Sign out
            </button>
            <Avatar name={email.split('@')[0] || 'You'} size="sm" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Meetings, minus the friction
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Start a room, or hop into one with a code.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-4
                         text-left transition-colors hover:border-accent/50 hover:bg-elevated"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-white">
                <Plus />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">New meeting</span>
                <span className="block text-xs text-ink-faint">Create a room and share the code</span>
              </span>
            </button>

            <button
              onClick={() => navigate('/join')}
              className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-4
                         text-left transition-colors hover:border-line-strong hover:bg-elevated"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-elevated
                               text-ink-muted ring-1 ring-line group-hover:text-ink">
                <Keypad />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">Join with a code</span>
                <span className="block text-xs text-ink-faint">Enter the 6-character code</span>
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateMeeting} className="card mb-6">
            <label htmlFor="title" className="label">Meeting title</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="title"
                type="text"
                placeholder="e.g. Weekly standup"
                value={newMeetingTitle}
                onChange={(e) => setNewMeetingTitle(e.target.value)}
                required
                autoFocus
                className="input-field min-w-0 flex-1"
              />
              <div className="flex gap-2 shrink-0">
                <button type="submit" className="btn-primary">Create</button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setNewMeetingTitle(''); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-faint">
          Your meetings
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface animate-pulse">
                <div className="aspect-video bg-tile" />
                <div className="p-4">
                  <div className="mb-2 h-4 w-2/3 rounded bg-line" />
                  <div className="h-3 w-1/2 rounded bg-line" />
                </div>
              </div>
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="card py-14 text-center">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-elevated text-ink-faint ring-1 ring-line">
              <Video className="h-5 w-5" />
            </span>
            <h3 className="mb-1.5 font-medium">No meetings yet</h3>
            <p className="mx-auto mb-6 max-w-xs text-sm text-ink-muted">
              Create your first room and share the code with your team.
            </p>
            <button onClick={() => setShowCreateForm(true)} className="btn-primary gap-2">
              <Plus className="h-4 w-4" /> New meeting
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {meetings.map((meeting) => (
              <button
                key={meeting.id}
                // Via the lobby, never straight to the room. The lobby is what
                // calls api.joinMeeting, and that database row is what puts you
                // in the roster snapshot other people dial from — jumping
                // straight in makes you invisible to WebRTC.
                onClick={() => navigate(`/lobby/${meeting.meetingCode}`)}
                className="group overflow-hidden rounded-xl border border-line bg-surface text-left
                           transition-colors hover:border-line-strong"
              >
                {/* stage preview */}
                <div className="relative aspect-video overflow-hidden bg-tile">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
                  <div className="absolute inset-0 grid place-items-center">
                    <Avatar name={meeting.hostName} />
                  </div>
                  <span className="absolute left-3 top-3">
                    <StatusPill status={meeting.status} />
                  </span>
                  <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md
                                   bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
                    <Users className="h-3.5 w-3.5" /> 1
                  </span>
                  <span className="absolute bottom-3 right-3 rounded-md bg-black/50 px-2 py-1
                                   font-mono text-xs tracking-widest text-white backdrop-blur-sm">
                    {meeting.meetingCode}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="truncate font-medium leading-snug group-hover:text-white">
                    {meeting.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-ink-faint">
                    {meeting.hostName} · {new Date(meeting.createdAt).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
