"use client";

import {
  Calendar,
  CheckCircle,
  Clock,
  Code,
  Download,
  Maximize2,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Play,
  Radio,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WS_URL } from "@/lib/config";

import { ordersApi } from "../api";
import type { LiveSessionPayload, LiveSessionRecord, OrderDetail } from "../types";

interface LiveCoachingStudioProps {
  order: OrderDetail;
  onRefresh: () => void;
}

export function LiveCoachingStudio({ order, onRefresh }: LiveCoachingStudioProps) {
  const [isInCall, setIsInCall] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSession, setActiveSession] = useState<LiveSessionRecord | null>(
    order.live_session?.active_session ?? null
  );
  const [recentSessions, setRecentSessions] = useState<LiveSessionRecord[]>(
    order.live_session?.recent_sessions ?? []
  );

  // Sync state when order updates
  useEffect(() => {
    if (order.live_session) {
      setActiveSession(order.live_session.active_session);
      setRecentSessions(order.live_session.recent_sessions);
    }
  }, [order.live_session]);

  const handleStartCall = async () => {
    setIsSubmitting(true);
    try {
      const res = await ordersApi.startLiveSession(order.id);
      setActiveSession(res.active_session);
      setIsInCall(true);
    } catch (err) {
      console.error("Failed to start live session", err);
      // Fallback: enter call UI directly
      setIsInCall(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDateTime) return;
    setIsSubmitting(true);
    try {
      const res = await ordersApi.scheduleLiveSession(order.id, scheduleDateTime);
      setActiveSession(res.active_session);
      setIsScheduling(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to schedule session", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndSession = async (durationSeconds: number, scratchpadContent: string) => {
    try {
      const res = await ordersApi.endLiveSession(order.id, durationSeconds, scratchpadContent);
      setActiveSession(res.active_session);
      setRecentSessions(res.recent_sessions);
      setIsInCall(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to end live session", err);
      setIsInCall(false);
      onRefresh();
    }
  };

  if (isInCall) {
    return (
      <LiveStudioRoom
        order={order}
        initialScratchpad={activeSession?.scratchpad_content || ""}
        onEndCall={handleEndSession}
      />
    );
  }

  const icsDownloadUrl = ordersApi.getIcsCalendarUrl(order.id);

  return (
    <Card className="p-6 bg-zinc-900/90 border-zinc-800 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              Live 1:1 Coaching & Collaborative Code Studio
            </h3>
            <Badge tone="success" className="text-xs">Self-Hosted WebRTC</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Zero third-party SaaS. Peer-to-peer encrypted HD video, browser screen sharing, and synchronized live code scratchpad.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleStartCall}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg shadow-emerald-950/40"
          >
            <Play className="w-4 h-4 fill-white" />
            Join Live Studio Now
          </Button>

          <Button
            onClick={() => setIsScheduling(!isScheduling)}
            variant="secondary"
            className="text-xs border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Schedule Session
          </Button>

          <a
            href={icsDownloadUrl}
            download={`coaching-session-${order.number}.ics`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 rounded-xl transition"
            title="Download RFC 5545 calendar invite (.ics)"
          >
            <Download className="w-3.5 h-3.5" />
            .ics Invite
          </a>
        </div>
      </div>

      {/* Scheduling form drawer */}
      {isScheduling && (
        <form onSubmit={handleSchedule} className="mt-4 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label htmlFor="coaching-datetime-input" className="block text-xs font-medium text-zinc-400 mb-1">
              Select Proposed Coaching Date & Time (UTC)
            </label>
            <input
              id="coaching-datetime-input"
              type="datetime-local"
              required
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-5 w-full sm:w-auto">
            <Button
              type="submit"
              disabled={isSubmitting || !scheduleDateTime}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-4 py-2"
            >
              Confirm Schedule
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsScheduling(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Active scheduled or live session banner */}
      {activeSession && (
        <div className="mt-4 p-4 rounded-xl bg-violet-950/30 border border-violet-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                {activeSession.status === "live" ? "Live Session Active Now" : "Upcoming Scheduled Session"}
                <Badge tone={activeSession.status === "live" ? "success" : "info"} className="text-xs uppercase">
                  {activeSession.status}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {activeSession.scheduled_at
                  ? `Scheduled for ${new Date(activeSession.scheduled_at).toLocaleString()}`
                  : `Created by ${activeSession.created_by?.name || "Participant"}`}
              </p>
            </div>
          </div>
          <Button
            onClick={handleStartCall}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Join Room
          </Button>
        </div>
      )}

      {/* Recent session history & completed scratchpads */}
      {recentSessions.length > 0 && (
        <div className="mt-5 pt-4 border-t border-zinc-800/60">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Completed Coaching Sessions & Saved Scratchpads ({recentSessions.length})
          </h4>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <details
                key={session.id}
                className="group rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3 text-xs text-zinc-300"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none select-none">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-violet-400" />
                    <span className="font-medium text-zinc-200">
                      Coaching Session #{session.id} · {Math.max(1, Math.round(session.duration_seconds / 60))} min duration
                    </span>
                    <span className="text-zinc-500">
                      {session.ended_at ? new Date(session.ended_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <span className="text-violet-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>

                {session.scratchpad_content ? (
                  <div className="mt-3 pt-3 border-t border-zinc-800/60">
                    <div className="text-[11px] text-zinc-400 mb-1 font-mono uppercase tracking-wider">
                      Saved Scratchpad Notes & Code:
                    </div>
                    <pre className="p-3 bg-zinc-900/90 rounded-lg font-mono text-xs text-zinc-200 overflow-x-auto whitespace-pre-wrap border border-zinc-800">
                      {session.scratchpad_content}
                    </pre>
                  </div>
                ) : (
                  <div className="mt-2 text-zinc-500 italic">No code notes recorded during this session.</div>
                )}
              </details>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// -------------------------------------------------------------
// LiveStudioRoom: In-Call WebRTC Stage & Real-Time Scratchpad
// -------------------------------------------------------------

interface LiveStudioRoomProps {
  order: OrderDetail;
  initialScratchpad: string;
  onEndCall: (durationSeconds: number, scratchpadContent: string) => void;
}

function LiveStudioRoom({ order, initialScratchpad, onEndCall }: LiveStudioRoomProps) {
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(true);
  const [scratchpadText, setScratchpadText] = useState(initialScratchpad);
  const [connectionStatus, setConnectionStatus] = useState<"Waiting for peer..." | "Signaling..." | "Connected · Live">("Waiting for peer...");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [peerName, setPeerName] = useState<string>(order.counterparty || "Peer");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Live duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Setup simulated fallback canvas stream when no hardware camera exists
  const getMediaStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
    } catch {
      // Hardware not present, denied, or headless browser
    }

    if (typeof HTMLCanvasElement === "undefined" || typeof MediaStream === "undefined") {
      return null;
    }

    // Canvas + WebAudio fallback for headless browser / automated testing
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext ? canvas.getContext("2d") : null;
      if (ctx) {
        ctx.fillStyle = "#18181b";
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = "#10b981";
        ctx.font = "20px monospace";
        ctx.fillText(`${order.role.toUpperCase()} - Live Video Feed`, 160, 180);
      }
      const canvasStream = canvas.captureStream ? canvas.captureStream(15) : new MediaStream();

      // Create silent audio track
      if (
        typeof window !== "undefined" &&
        (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      ) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtxClass();
        const dest = audioCtx.createMediaStreamDestination();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001; // nearly silent
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        dest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
      }
      return canvasStream;
    } catch {
      return null;
    }
  }, [order.role]);

  // WebSocket signaling and WebRTC setup
  useEffect(() => {
    let active = true;

    async function init() {
      if (typeof RTCPeerConnection === "undefined" || typeof WebSocket === "undefined") {
        return;
      }

      // 1. Get media stream
      const stream = await getMediaStream();
      if (!active) return;
      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }

      // 2. Initialize RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // Add tracks
      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      // Handle remote track
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setConnectionStatus("Connected · Live");
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "webrtc_ice_candidate",
              candidate: event.candidate,
            })
          );
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectionStatus("Connected · Live");
        } else if (pc.connectionState === "connecting") {
          setConnectionStatus("Signaling...");
        }
      };

      // 3. Connect WebSocket
      const wsUrl = `${WS_URL}/ws/orders/${order.id}/live/`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("Signaling...");
        ws.send(JSON.stringify({ type: "peer_join" }));
      };

      ws.onmessage = async (evt) => {
        try {
          const data = JSON.parse(evt.data);

          if (data.type === "peer_join") {
            setPeerName(data.user_name || "Connected Peer");
            setConnectionStatus("Connected · Live");

            // Role-based initiator: expert initiates offer
            if (order.role === "expert") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: "webrtc_offer", sdp: offer.sdp }));
            }
          } else if (data.type === "webrtc_offer") {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: data.sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "webrtc_answer", sdp: answer.sdp }));
            setConnectionStatus("Connected · Live");
          } else if (data.type === "webrtc_answer") {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: data.sdp }));
            setConnectionStatus("Connected · Live");
          } else if (data.type === "webrtc_ice_candidate" && data.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (iceErr) {
              console.warn("ICE candidate error", iceErr);
            }
          } else if (data.type === "scratchpad_update") {
            if (typeof data.content === "string") {
              setScratchpadText(data.content);
            }
          }
        } catch (err) {
          console.error("WS error handling message", err);
        }
      };
    }

    void init();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [getMediaStream, order.id, order.role]);

  // Scratchpad typing sync
  const handleScratchpadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setScratchpadText(newContent);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "scratchpad_update",
          content: newContent,
        })
      );
    }
  };

  // Toggle Mute
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = micMuted));
      setMicMuted(!micMuted);
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => (t.enabled = videoOff));
      setVideoOff(!videoOff);
    }
  };

  // Screen Share
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        if (navigator.mediaDevices?.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = displayStream.getVideoTracks()[0];
          if (screenTrack && pcRef.current) {
            const senders = pcRef.current.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === "video");
            if (videoSender) {
              await videoSender.replaceTrack(screenTrack);
            }
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = displayStream;
            }
            screenTrack.onended = () => {
              setScreenSharing(false);
            };
            setScreenSharing(true);
          }
        }
      } catch {
        // user cancelled or unsupported
      }
    } else {
      // Revert to camera stream
      if (localStreamRef.current && pcRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0];
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === "video");
        if (videoSender && camTrack) {
          await videoSender.replaceTrack(camTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setScreenSharing(false);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col h-[700px]">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            Live 1:1 Coaching Studio · #{order.number}
          </div>
          <Badge tone="success" className="text-xs font-mono">
            {connectionStatus}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700/80">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            {formatTime(durationSeconds)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Users className="w-3.5 h-3.5" />
            <span>2 Participants</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Video Stage & Collaborative Scratchpad */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 bg-zinc-950">
        {/* Video Stage Column */}
        <div className={`${scratchpadOpen ? "lg:col-span-7" : "lg:col-span-12"} p-4 flex flex-col gap-3 min-h-0 relative`}>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0">
            {/* Remote Peer Video Container */}
            <div className="relative rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-200 border border-zinc-800">
                {peerName}
              </div>
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                <span className="p-1 rounded bg-zinc-900/80 text-emerald-400">
                  <Radio className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Local Video Container */}
            <div className="relative rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-200 border border-zinc-800">
                You ({order.role === "expert" ? "Specialist" : "Student"})
              </div>
              {micMuted && (
                <div className="absolute top-3 right-3 bg-rose-500/80 text-white p-1 rounded-md">
                  <MicOff className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collaborative Scratchpad Column */}
        {scratchpadOpen && (
          <div className="lg:col-span-5 p-4 pl-0 flex flex-col min-h-0 border-l border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Code className="w-4 h-4 text-violet-400" />
                Collaborative Scratchpad (Real-Time Sync)
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Synced over WS</span>
            </div>
            <textarea
              value={scratchpadText}
              onChange={handleScratchpadChange}
              placeholder="// Type formulas, econometrics code, or coaching notes here...&#10;// Synchronized live to both Student and Specialist browsers."
              className="flex-1 w-full p-3 font-mono text-xs bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mute Mic */}
          <button
            onClick={toggleMic}
            className={`p-3 rounded-xl border transition ${
              micMuted
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            }`}
            title={micMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-xl border transition ${
              videoOff
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            }`}
            title={videoOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Share Screen */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-xl border transition ${
              screenSharing
                ? "bg-violet-600 border-violet-500 text-white"
                : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
            }`}
            title={screenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Toggle Scratchpad */}
          <button
            onClick={() => setScratchpadOpen(!scratchpadOpen)}
            className={`p-3 rounded-xl border transition ${
              scratchpadOpen
                ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
            }`}
            title="Toggle Collaborative Scratchpad"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>

        {/* End & Save Session */}
        <Button
          onClick={() => onEndCall(durationSeconds, scratchpadText)}
          className="bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-rose-950/40"
        >
          <PhoneOff className="w-4 h-4" />
          End & Save Session
        </Button>
      </div>
    </div>
  );
}
