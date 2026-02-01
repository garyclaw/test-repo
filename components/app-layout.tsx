"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Bookmark,
  Bot,
  Brain,
  CircleCheck,
  Cpu,
  FlaskConical,
  FolderOpen,
  ListChecks,
  MessageSquare,
  PenTool,
  PanelLeft,
  Radio,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  Terminal,
  Wrench,
  CalendarClock,
  Pencil,
  Trash2,
  Plus,
  Tag,
  ScrollText,
  Play,
  Square,
  Trash,
  FileText,
} from "lucide-react";

type TabKey = "swarm" | "ops" | "chat" | "bookmarks" | "logs" | "memory" | "files";

type Agent = {
  name: string;
  status: "idle" | "busy" | "offline";
};

type Task = {
  title: string;
  state: "todo" | "doing" | "done";
};

type SessionListItem = {
  sessionKey?: string;
  key?: string;
  kind?: string;
  age?: string;
  model?: string;
  tokens?: string;
  sessionId?: string;
};

type HistoryItem = {
  role?: string;
  content?: string;
  text?: string;
  ts?: string;
  createdAt?: string;
  author?: string;
};

type Skill = {
  name: string;
  description?: string;
  emoji?: string;
  eligible?: boolean;
  disabled?: boolean;
  blockedByAllowlist?: boolean;
  source?: string;
};

type CronJob = {
  id?: string;
  name?: string;
  enabled?: boolean;
  schedule?: unknown;
  sessionTarget?: string;
  state?: { nextRunAtMs?: number };
};

type AgentRow = {
  id?: string;
  identityName?: string;
  identityEmoji?: string;
  model?: string;
  workspace?: string;
  isDefault?: boolean;
};

type BookmarkItem = {
  id: string;
  title: string;
  url?: string;
  note?: string;
  tags?: string[];
  createdAtMs?: number;
  updatedAtMs?: number;
};

export function AppLayout() {
  const [tab, setTab] = useState<TabKey>("swarm");
  const [statusText, setStatusText] = useState<string>("");

  // Browser control (via Gateway browser.request)
  const [browserProfile, setBrowserProfile] = useState<string>("chrome");
  const [browserStatus, setBrowserStatus] = useState<any>(null);
  const [browserTabs, setBrowserTabs] = useState<any[]>([]);
  const [browserUrlDraft, setBrowserUrlDraft] = useState<string>("");
  const [browserLastShot, setBrowserLastShot] = useState<string>("");

  // Sessions
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>("agent:main:main");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [chatDraft, setChatDraft] = useState<string>("");
  const [chatSending, setChatSending] = useState(false);
  const [chatAgentId, setChatAgentId] = useState<string>("main");

  // Swarm dispatch
  const [missionPrompt, setMissionPrompt] = useState<string>("Research our top 3 competitors and write a brief analysis report.");
  const [missionAgentId, setMissionAgentId] = useState<string>("main");
  const [missionMode, setMissionMode] = useState<"single" | "swarm">("single");
  const [missionRunning, setMissionRunning] = useState(false);
  const [missionOutput, setMissionOutput] = useState<string>("");

  // Mission history
  const [missions, setMissions] = useState<
    Array<{ id: string; title: string; prompt: string; mode: "single" | "swarm"; status: string; output?: string; updatedAtMs?: number }>
  >([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>("");
  const [missionQuery, setMissionQuery] = useState<string>("");
  const [missionStatusFilter, setMissionStatusFilter] = useState<"all" | "queued" | "running" | "done" | "error">("all");

  // Ops datasets
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [agentRows, setAgentRows] = useState<AgentRow[]>([]);
  const [channels, setChannels] = useState<any[]>([]);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bmTitle, setBmTitle] = useState<string>("");
  const [bmUrl, setBmUrl] = useState<string>("");
  const [bmTags, setBmTags] = useState<string>("");
  const [bmNote, setBmNote] = useState<string>("");

  // Admin
  const [adminKey, setAdminKey] = useState<string>("");
  const adminUnlocked = !!adminKey;
  const [adminOut, setAdminOut] = useState<string>("");

  // Logs
  const [logsLines, setLogsLines] = useState<string[]>([]);
  const [logsStreaming, setLogsStreaming] = useState(false);
  const [logsAutoScroll, setLogsAutoScroll] = useState(true);
  const [logsFile, setLogsFile] = useState<"gateway" | "gateway.err" | "dashboard">("gateway");
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsAbortRef = useRef<(() => void) | null>(null);

  // Memory
  const [memoryFiles, setMemoryFiles] = useState<{ main: { path: string; exists: boolean }; daily: string[]; directory: string } | null>(null);
  const [selectedMemoryFile, setSelectedMemoryFile] = useState<string>("");
  const [memoryContent, setMemoryContent] = useState<string>("");
  const [memorySearchQuery, setMemorySearchQuery] = useState<string>("");
  const [memorySearchResults, setMemorySearchResults] = useState<Array<{ file: string; line: number; text: string; context: string }>>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);

  // File Explorer
  const [filePath, setFilePath] = useState<string>(".");
  const [fileList, setFileList] = useState<Array<{ name: string; type: "dir" | "file"; path: string }>>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [fileOriginalContent, setFileOriginalContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileSaving, setFileSaving] = useState(false);
  const [fileDirty, setFileDirty] = useState(false);
  const [newFileName, setNewFileName] = useState<string>("");
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  const agents: Agent[] = [
    { name: "Analyst", status: "idle" },
    { name: "Coder", status: "idle" },
    { name: "Planner", status: "idle" },
    { name: "Researcher", status: "idle" },
  ];

  const tasks: Task[] = [
    { title: "Plan: Competitor Analysis Test", state: "done" },
    { title: "Research Competitor 1", state: "done" },
    { title: "Research Competitor 2", state: "done" },
    { title: "Research Competitor 3", state: "done" },
    { title: "Write Competitor Analysis Report", state: "done" },
  ];

  const tabTitle = useMemo(() => {
    switch (tab) {
      case "swarm":
        return "Swarm";
      case "ops":
        return "Ops";
      case "chat":
        return "Chat";
      case "bookmarks":
        return "Bookmarks";
      case "logs":
        return "Logs";
      case "memory":
        return "Memory";
      case "files":
        return "Files";
      default:
        return "Swarm";
    }
  }, [tab]);

  const refreshAll = useCallback(async () => {
    // status
    fetch("/api/status")
      .then((r) => r.json())
      .then((j) => setStatusText(j?.stdout ?? ""))
      .catch(() => setStatusText(""));

    // browser (best-effort)
    fetch(`/api/browser/status?profile=${encodeURIComponent(browserProfile)}`)
      .then((r) => r.json())
      .then((j) => setBrowserStatus(j?.data ?? null))
      .catch(() => setBrowserStatus(null));

    fetch(`/api/browser/tabs?profile=${encodeURIComponent(browserProfile)}`)
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data;
        const tabs = Array.isArray(d?.tabs) ? d.tabs : [];
        setBrowserTabs(tabs);
      })
      .catch(() => setBrowserTabs([]));

    // sessions
    fetch("/api/sessions?limit=20")
      .then((r) => r.json())
      .then((j) => {
        const data = j?.data;
        const list = Array.isArray(data?.sessions) ? data.sessions : Array.isArray(data) ? data : [];
        setSessions(list);

        // keep selectedSessionId in sync
        const found = list.find(
          (s: { sessionKey?: string; key?: string; sessionId?: string }) => (s.sessionKey ?? s.key) === selectedSessionKey,
        );
        if (found?.sessionId) setSelectedSessionId(found.sessionId);
      })
      .catch(() => setSessions([]));

    // missions
    fetch("/api/missions")
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data;
        const list = Array.isArray(d?.missions) ? d.missions : [];
        setMissions(list);
        if (!selectedMissionId && list[0]?.id) setSelectedMissionId(list[0].id);
      })
      .catch(() => setMissions([]));

    // cron
    fetch("/api/cron?all=1")
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data;
        const jobs = Array.isArray(d?.jobs) ? d.jobs : Array.isArray(d) ? d : [];
        setCronJobs(jobs);
      })
      .catch(() => setCronJobs([]));

    // skills
    fetch("/api/skills/list")
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data;
        const list = Array.isArray(d?.skills) ? d.skills : Array.isArray(d) ? d : [];
        setSkills(list);
      })
      .catch(() => setSkills([]));

    // agents
    fetch("/api/agents/list")
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data;
        const list = Array.isArray(d) ? d : Array.isArray(d?.agents) ? d.agents : [];
        setAgentRows(list);
      })
      .catch(() => setAgentRows([]));

    // channels
    fetch("/api/channels/status")
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data;
        const list = Array.isArray(d?.channels) ? d.channels : Array.isArray(d) ? d : [];
        setChannels(list);
      })
      .catch(() => setChannels([]));

    // bookmarks
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data;
        const list = Array.isArray(d?.bookmarks) ? d.bookmarks : [];
        setBookmarks(list);
      })
      .catch(() => setBookmarks([]));
  }, [selectedMissionId, selectedSessionKey]);

  async function loadHistory(sessionKey: string) {
    fetch(`/api/sessions/history?sessionKey=${encodeURIComponent(sessionKey)}&limit=50`)
      .then((r) => r.json())
      .then((j) => {
        const data = j?.data;
        const items = Array.isArray(data?.messages)
          ? data.messages
          : Array.isArray(data)
            ? data
            : [];
        setHistory(items);
      })
      .catch(() => setHistory([]));
  }

  async function sendChat() {
    const msg = chatDraft.trim();
    if (!msg) return;
    
    // Clear input immediately
    setChatDraft("");
    setChatSending(true);
    
    // Add user message immediately
    const userMsg = {
      role: "user" as const,
      content: msg,
      ts: new Date().toISOString(),
    };
    setHistory((h) => [...h, userMsg]);
    
    // Scroll to bottom
    setTimeout(() => {
      const el = document.getElementById("chat-messages");
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
    
    try {
      const url = new URL("/api/agent/stream", window.location.origin);
      url.searchParams.set("message", msg);
      url.searchParams.set("agentId", chatAgentId);
      if (selectedSessionId) url.searchParams.set("sessionId", selectedSessionId);
      url.searchParams.set("timeoutSeconds", "600");

      let combined = "";
      await new Promise<void>((resolve, reject) => {
        const es = new EventSource(url.toString());
        
        // Add placeholder for assistant response
        setHistory((h) => [
          ...h,
          {
            role: "assistant" as const,
            content: "",
            ts: new Date().toISOString(),
          },
        ]);

        es.addEventListener("stdout", (ev) => {
          const text = String((ev as MessageEvent).data ?? "");
          combined += text;
          
          // Update the last assistant message
          setHistory((h) => {
            const next = [...h];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
              next[lastIdx] = { ...next[lastIdx], content: combined };
            }
            return next;
          });
          
          // Auto-scroll
          const el = document.getElementById("chat-messages");
          if (el) el.scrollTop = el.scrollHeight;
        });

        es.addEventListener("stderr", (ev) => {
          const text = String((ev as MessageEvent).data ?? "");
          combined += text;
          setHistory((h) => {
            const next = [...h];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
              next[lastIdx] = { ...next[lastIdx], content: combined };
            }
            return next;
          });
        });

        es.addEventListener("error", () => {
          es.close();
          reject(new Error("Stream error"));
        });

        es.addEventListener("end", () => {
          es.close();
          resolve();
        });
      });
    } catch (err) {
      // Add error message
      setHistory((h) => [
        ...h,
        {
          role: "assistant" as const,
          content: "(error: message failed)",
          ts: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatSending(false);
      // Reload history to sync with server
      await loadHistory(selectedSessionKey);
    }
  }

  async function dispatchMission() {
    const msg = missionPrompt.trim();
    if (!msg) return;

    // Create mission record first
    const title = msg.split("\n")[0].slice(0, 80) || "Mission";
    const created = await fetch("/api/missions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, prompt: msg, mode: missionMode, agentId: missionAgentId }),
    }).then((r) => r.json());

    const missionId = created?.data?.id as string;
    if (missionId) setSelectedMissionId(missionId);

    setMissionRunning(true);
    setMissionOutput("");

    const append = (chunk: string) => {
      setMissionOutput((prev) => (prev ? prev + chunk : chunk));
    };

    if (missionMode === "swarm") {
      const qs = new URLSearchParams({
        missionId,
        prompt: msg,
        agentId: missionAgentId,
        thinking: "low",
        timeoutSeconds: "600",
      });

      const es = new EventSource(`/api/swarm/stream?${qs.toString()}`);

      es.addEventListener("role_start", (e) => {
        append(`\n[role start] ${(e as MessageEvent).data}\n`);
      });
      es.addEventListener("role_stdout", (e) => {
        const payload = JSON.parse(String((e as MessageEvent).data));
        append(`\n\n=== ${payload.role} ===\n${payload.chunk}`);
      });
      es.addEventListener("role_stderr", (e) => {
        const payload = JSON.parse(String((e as MessageEvent).data));
        append(`\n\n=== ${payload.role} (stderr) ===\n${payload.chunk}`);
      });
      es.addEventListener("role_end", (e) => append(`\n[role end] ${(e as MessageEvent).data}\n`));
      es.addEventListener("error", () => {
        append(`\n[stream error]\n`);
        es.close();
        setMissionRunning(false);
      });
      es.addEventListener("end", async (e) => {
        append(`\n\n[done] ${(e as MessageEvent).data}\n`);
        es.close();
        setMissionRunning(false);
        await refreshAll();
      });
      return;
    }

    const qs = new URLSearchParams({
      missionId,
      message: msg,
      agentId: missionAgentId,
      thinking: "low",
      timeoutSeconds: "600",
    });

    const es = new EventSource(`/api/agent/stream?${qs.toString()}`);

    es.addEventListener("stdout", (e) => append(String((e as MessageEvent).data)));
    es.addEventListener("stderr", (e) => append(String((e as MessageEvent).data)));
    es.addEventListener("error", (e) => {
      append(`\n[stream error]\n`);
      try {
        console.error(e);
      } catch {
        // ignore
      }
      es.close();
      setMissionRunning(false);
    });
    es.addEventListener("end", async (e) => {
      append(`\n\n[done] ${(e as MessageEvent).data}\n`);
      es.close();
      setMissionRunning(false);
      await refreshAll();
    });
  }

  async function renameMission(id: string, current: string) {
    const next = prompt("Rename mission:", current);
    if (!next || next.trim() === current) return;
    await fetch("/api/missions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, title: next.trim() }),
    });
    await refreshAll();
  }

  async function deleteMission(id: string) {
    if (!confirm("Delete this mission?")) return;
    await fetch(`/api/missions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (selectedMissionId === id) setSelectedMissionId("");
    await refreshAll();
  }

  async function addBookmark() {
    const title = bmTitle.trim();
    if (!title) return;
    const tags = bmTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        url: bmUrl.trim() || undefined,
        note: bmNote.trim() || undefined,
        tags: tags.length ? tags : undefined,
      }),
    });

    setBmTitle("");
    setBmUrl("");
    setBmTags("");
    setBmNote("");
    await refreshAll();
  }

  async function editBookmark(b: BookmarkItem) {
    const title = prompt("Title:", b.title) ?? b.title;
    const url = prompt("URL (blank to clear):", b.url ?? "") ?? b.url ?? "";
    const tags = prompt("Tags (comma separated):", (b.tags ?? []).join(", ")) ?? (b.tags ?? []).join(", ");
    const note = prompt("Note (optional):", b.note ?? "") ?? b.note ?? "";

    await fetch("/api/bookmarks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: b.id,
        title: title.trim() || b.title,
        url: url.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        note: note.trim() || undefined,
      }),
    });

    await refreshAll();
  }

  async function deleteBookmark(id: string) {
    if (!confirm("Delete this bookmark?")) return;
    await fetch(`/api/bookmarks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await refreshAll();
  }

  async function bookmarkFromCurrentMission() {
    const m = missions.find((x) => x.id === selectedMissionId);
    const title = m?.title || missionPrompt.split("\n")[0].slice(0, 80) || "Mission output";
    const note = `PROMPT:\n${m?.prompt ?? missionPrompt}\n\nOUTPUT:\n${m?.output ?? missionOutput}`;

    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        note,
        tags: ["mission", "output"],
      }),
    });

    setTab("bookmarks");
    await refreshAll();
  }

  async function cronAction(action: "enable" | "disable" | "run" | "remove", id: string) {
    if (!adminUnlocked) {
      alert("Unlock admin first.");
      return;
    }
    const res = await fetch("/api/cron", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ action, id }),
    });
    const j = await res.json().catch(() => ({}));
    setAdminOut(j?.stdout ?? j?.error ?? "");
    await refreshAll();
  }

  async function gatewayRestart() {
    if (!adminUnlocked) {
      alert("Unlock admin first.");
      return;
    }
    const res = await fetch("/api/admin/gateway/restart", {
      method: "POST",
      headers: { "x-admin-key": adminKey },
    });
    const j = await res.json().catch(() => ({}));
    setAdminOut(j?.stdout ?? j?.error ?? "");
    await refreshAll();
  }

  async function runDoctor() {
    if (!adminUnlocked) {
      alert("Unlock admin first.");
      return;
    }
    const res = await fetch("/api/admin/doctor", {
      method: "POST",
      headers: { "x-admin-key": adminKey },
    });
    const j = await res.json().catch(() => ({}));
    setAdminOut(j?.stdout ?? j?.error ?? "");
    await refreshAll();
  }

  // Logs streaming
  function startLogsStream() {
    if (logsStreaming) return;
    setLogsStreaming(true);
    const url = new URL("/api/logs/stream", window.location.origin);
    url.searchParams.set("limit", "500");
    url.searchParams.set("follow", "true");
    url.searchParams.set("file", logsFile);
    const es = new EventSource(url.toString());
    logsAbortRef.current = () => es.close();

    es.addEventListener("connected", () => {
      setLogsLines((prev) => [...prev, `[connected to ${logsFile} stream]`]);
    });

    es.addEventListener("line", (e) => {
      const line = String((e as MessageEvent).data ?? "");
      setLogsLines((prev) => {
        const next = [...prev, line];
        return next.length > 1000 ? next.slice(-500) : next;
      });
    });

    es.addEventListener("error", (e) => {
      const data = String((e as MessageEvent).data ?? "");
      setLogsLines((prev) => [...prev, `[error: ${data}]`]);
      es.close();
      setLogsStreaming(false);
    });

    es.addEventListener("end", () => {
      setLogsLines((prev) => [...prev, "[stream ended]"]);
      es.close();
      setLogsStreaming(false);
    });

    es.onerror = () => {
      es.close();
      setLogsStreaming(false);
    };
  }

  function stopLogsStream() {
    if (logsAbortRef.current) {
      logsAbortRef.current();
      logsAbortRef.current = null;
    }
    setLogsStreaming(false);
  }

  function clearLogs() {
    setLogsLines([]);
  }

  // Auto-scroll logs
  useEffect(() => {
    if (logsAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logsLines, logsAutoScroll]);

  // Memory functions
  async function loadMemoryList() {
    try {
      const res = await fetch("/api/memory/list");
      const j = await res.json();
      if (j.ok) {
        setMemoryFiles(j.data);
        if (j.data.main.exists && !selectedMemoryFile) {
          setSelectedMemoryFile("MEMORY.md");
          await loadMemoryFile("MEMORY.md");
        }
      }
    } catch {
      // ignore
    }
  }

  async function loadMemoryFile(filename: string) {
    setMemoryLoading(true);
    try {
      const res = await fetch(`/api/memory/get?file=${encodeURIComponent(filename)}`);
      const j = await res.json();
      if (j.ok) {
        setMemoryContent(j.data.content);
        setSelectedMemoryFile(filename);
      }
    } catch {
      setMemoryContent("(error loading file)");
    } finally {
      setMemoryLoading(false);
    }
  }

  async function searchMemory() {
    const q = memorySearchQuery.trim();
    if (!q || q.length < 2) return;
    setMemoryLoading(true);
    try {
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(q)}`);
      const j = await res.json();
      if (j.ok) {
        setMemorySearchResults(j.data.results);
      }
    } catch {
      setMemorySearchResults([]);
    } finally {
      setMemoryLoading(false);
    }
  }

  // Load memory list when switching to memory tab
  useEffect(() => {
    if (tab === "memory" && !memoryFiles) {
      loadMemoryList();
    }
  }, [tab, memoryFiles]);

  // File Explorer functions
  async function loadFileList(path: string = ".") {
    setFileLoading(true);
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
      const j = await res.json();
      if (j.ok) {
        setFilePath(j.data.path);
        setFileList(j.data.files);
      }
    } catch {
      // ignore
    } finally {
      setFileLoading(false);
    }
  }

  async function loadFile(path: string) {
    setFileLoading(true);
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
      const j = await res.json();
      if (j.ok) {
        setSelectedFile(j.data.path);
        setFileContent(j.data.content);
        setFileOriginalContent(j.data.content);
        setFileDirty(false);
      }
    } catch {
      setFileContent("(error loading file)");
    } finally {
      setFileLoading(false);
    }
  }

  async function saveFile() {
    if (!selectedFile || !fileDirty) return;
    setFileSaving(true);
    try {
      const res = await fetch("/api/files/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: selectedFile, content: fileContent }),
      });
      const j = await res.json();
      if (j.ok) {
        setFileOriginalContent(fileContent);
        setFileDirty(false);
      }
    } catch {
      // ignore
    } finally {
      setFileSaving(false);
    }
  }

  // Load file list when switching to files tab
  useEffect(() => {
    if (tab === "files" && fileList.length === 0) {
      loadFileList();
    }
  }, [tab, fileList.length]);

  async function createNewFile() {
    const name = newFileName.trim();
    if (!name) return;
    
    // Ensure .md extension if none provided
    const fileName = name.includes('.') ? name : `${name}.md`;
    const fullPath = filePath === '.' ? fileName : `${filePath}/${fileName}`;
    
    setFileSaving(true);
    try {
      const res = await fetch("/api/files/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: fullPath, content: "" }),
      });
      const j = await res.json();
      if (j.ok) {
        setNewFileName("");
        setShowNewFileInput(false);
        await loadFileList();
        await loadFile(fullPath);
      }
    } catch {
      // ignore
    } finally {
      setFileSaving(false);
    }
  }

  useEffect(() => {
    try {
      const k = localStorage.getItem("gary_admin_key") ?? "";
      if (k) setAdminKey(k);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (adminKey) localStorage.setItem("gary_admin_key", adminKey);
      else localStorage.removeItem("gary_admin_key");
    } catch {
      // ignore
    }
  }, [adminKey]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Poll while running so mission list updates (status/output)
  useEffect(() => {
    if (!missionRunning) return;
    const t = setInterval(() => {
      refreshAll();
    }, 2000);
    return () => clearInterval(t);
  }, [missionRunning, refreshAll]);

  useEffect(() => {
    if (selectedSessionKey) loadHistory(selectedSessionKey);
  }, [selectedSessionKey]);

  return (
    <div className="noise min-h-dvh bg-[var(--background)] text-slate-100">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-slate-800/60 bg-[#070b12]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/60 bg-slate-950/30">
              <Sparkles className="h-4 w-4 text-sky-300" />
            </div>
            <div className="text-sm tracking-widest text-slate-300">
              <span className="font-mono text-slate-300">GARY_OS</span>{" "}
              <span className="font-mono text-slate-500">v0.1</span>
            </div>
          </div>

          <div className="mx-4 hidden h-6 w-px bg-slate-800/70 md:block" />

          <nav className="flex items-center gap-2">
            <TabButton active={tab === "swarm"} onClick={() => setTab("swarm")}>
              <Cpu className="h-4 w-4" />
              Swarm
            </TabButton>
            <TabButton active={tab === "ops"} onClick={() => setTab("ops")}>
              <Settings className="h-4 w-4" />
              Ops
            </TabButton>
            <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabButton>
            <TabButton active={tab === "bookmarks"} onClick={() => setTab("bookmarks")}>
              <Bookmark className="h-4 w-4" />
              Bookmarks
            </TabButton>
            <TabButton active={tab === "logs"} onClick={() => setTab("logs")}>
              <ScrollText className="h-4 w-4" />
              Logs
            </TabButton>
            <TabButton active={tab === "memory"} onClick={() => setTab("memory")}>
              <Brain className="h-4 w-4" />
              Memory
            </TabButton>
            <TabButton active={tab === "files"} onClick={() => setTab("files")}>
              <FolderOpen className="h-4 w-4" />
              Files
            </TabButton>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2 text-xs text-slate-300 md:flex">
              <Shield className="h-4 w-4 text-sky-300" />
              Local-only
              <span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1">
                <Radio className="h-3.5 w-3.5 text-emerald-400" /> Connected
              </span>
            </div>
            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 hover:bg-slate-950/50"
            >
              <RefreshCw className="h-4 w-4 text-sky-300" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[320px_1fr_320px]">
        {/* Left */}
        <Panel title="Mission Control" icon={<PanelLeft className="h-4 w-4 text-sky-300" />}>
          <SectionLabel>Missions</SectionLabel>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <input
              value={missionQuery}
              onChange={(e) => setMissionQuery(e.target.value)}
              placeholder="Search missions…"
              className="w-full rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
            />
            <select
              value={missionStatusFilter}
              onChange={(e) => setMissionStatusFilter(e.target.value as "all" | "queued" | "running" | "done" | "error")}
              className="w-full rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-600/50"
            >
              <option value="all">all</option>
              <option value="running">running</option>
              <option value="queued">queued</option>
              <option value="done">done</option>
              <option value="error">error</option>
            </select>
          </div>

          <div className="mt-3 space-y-2">
            {missions.length ? (
              missions
                .filter((m) => {
                  const q = missionQuery.trim().toLowerCase();
                  const matchQ = !q || (m.title + "\n" + m.prompt).toLowerCase().includes(q);
                  const matchS = missionStatusFilter === "all" || m.status === missionStatusFilter;
                  return matchQ && matchS;
                })
                .slice(0, 12)
                .map((m) => {
                const active = m.id === selectedMissionId;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMissionId(m.id);
                      setMissionPrompt(m.prompt ?? "");
                      setMissionMode(m.mode ?? "single");
                      setTab("swarm");
                      setMissionOutput(m.output ?? "");
                    }}
                    className={
                      "w-full rounded-md border p-3 text-left " +
                      (active
                        ? "glow-blue border-sky-600/40 bg-sky-500/10"
                        : "border-slate-800/70 bg-slate-950/10 hover:bg-slate-950/20")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1 text-sm font-medium text-slate-200 truncate">{m.title}</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            renameMission(m.id, m.title);
                          }}
                          className="rounded border border-slate-800/70 bg-slate-950/20 p-1 text-slate-300 hover:bg-slate-950/40"
                          title="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteMission(m.id);
                          }}
                          className="rounded border border-slate-800/70 bg-slate-950/20 p-1 text-slate-300 hover:bg-slate-950/40"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          {m.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      <span className="mr-2">{m.mode}</span>
                      <span className="text-slate-700">•</span>
                      <span className="ml-2">
                        {m.updatedAtMs ? new Date(m.updatedAtMs).toLocaleTimeString() : ""}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-3 text-sm text-slate-400">
                No missions yet. Dispatch one.
              </div>
            )}
          </div>

          <div className="mt-6">
            <SectionLabel>Active sessions</SectionLabel>
            <div className="mt-3 space-y-2">
              {sessions.length ? (
                sessions.map((s, idx) => {
                const key = (s.sessionKey ?? s.key ?? "") as string;
                const label = key || `session-${idx}`;
                const active = key === selectedSessionKey;
                return (
                  <button
                    key={label}
                    onClick={() => {
                      if (key) {
                        setSelectedSessionKey(key);
                        setSelectedSessionId(s.sessionId ?? "");
                        setTab("chat");
                      }
                    }}
                    className={
                      "w-full rounded-md border p-3 text-left " +
                      (active
                        ? "glow-blue border-sky-600/40 bg-sky-500/10"
                        : "border-slate-800/70 bg-slate-950/10 hover:bg-slate-950/20")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-200">{label}</div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        {s.kind ?? "session"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      <span className="mr-2">{s.model ?? ""}</span>
                      <span className="text-slate-700">•</span>
                      <span className="ml-2">{s.tokens ?? ""}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <MissionCard title="agent:main:main" progress={100} status="completed" />
            )}
            </div>
          </div>

          <div className="mt-6">
            <SectionLabel>Search</SectionLabel>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2 text-sm text-slate-300">
              <Search className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500">Search sessions…</span>
            </div>
          </div>
        </Panel>

        {/* Center */}
        <Panel
          title={tab === "swarm" ? "Competitor Analysis Test" : tabTitle}
          icon={<ListChecks className="h-4 w-4 text-sky-300" />}
          actions={
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 hover:bg-slate-950/50">
                <RefreshCw className="h-4 w-4 text-sky-300" />
                Sync
              </button>
              <button className="glow-blue inline-flex items-center gap-2 rounded-md border border-sky-700/40 bg-sky-500/10 px-3 py-2 text-xs text-slate-100 hover:bg-sky-500/15">
                <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,0.8)]" />
                Add task
              </button>
            </div>
          }
        >
          {tab === "swarm" ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                  <Cpu className="h-4 w-4 text-sky-300" /> Dispatch mission
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
                  <textarea
                    value={missionPrompt}
                    onChange={(e) => setMissionPrompt(e.target.value)}
                    rows={5}
                    className="w-full rounded-md border border-slate-800/70 bg-slate-950/30 p-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                  />

                  <div className="flex flex-col gap-2">
                    <div className="rounded-md border border-slate-800/70 bg-slate-950/20 p-3">
                      <div className="font-mono text-[10px] uppercase text-slate-500">Mode</div>
                      <select
                        value={missionMode}
                        onChange={(e) => setMissionMode(e.target.value as "single" | "swarm")}
                        className="mt-2 w-full rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-600/50"
                      >
                        <option value="single">single</option>
                        <option value="swarm">swarm (Analyst/Researcher/Planner)</option>
                      </select>
                      <div className="mt-2 font-mono text-[10px] uppercase text-slate-600">thinking: low</div>
                    </div>

                    <div className="rounded-md border border-slate-800/70 bg-slate-950/20 p-3">
                      <div className="font-mono text-[10px] uppercase text-slate-500">Agent</div>
                      <select
                        value={missionAgentId}
                        onChange={(e) => setMissionAgentId(e.target.value)}
                        className="mt-2 w-full rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-600/50"
                      >
                        {agentRows.length ? (
                          agentRows.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.identityName ?? a.id}
                            </option>
                          ))
                        ) : (
                          <option value="main">main</option>
                        )}
                      </select>
                    </div>

                    <button
                      disabled={missionRunning}
                      onClick={dispatchMission}
                      className="glow-blue inline-flex items-center justify-center gap-2 rounded-md border border-sky-700/40 bg-sky-500/10 px-3 py-2 text-sm text-slate-100 hover:bg-sky-500/15 disabled:opacity-60"
                    >
                      {missionRunning ? (
                        "Running…"
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,0.8)]" />
                          Dispatch
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-[10px] uppercase text-slate-500">Output</div>
                    <button
                      onClick={bookmarkFromCurrentMission}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-800/70 bg-slate-950/20 px-2 py-1 font-mono text-[10px] uppercase text-slate-300 hover:bg-slate-950/40"
                      title="Save prompt+output to Bookmarks"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-sky-300" /> Save
                    </button>
                  </div>
                  <pre className="mt-2 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950/30 p-3 font-mono text-xs text-slate-200">
                    {missionOutput || "(no output yet)"}
                  </pre>
                </div>
              </div>

              <div className="rounded-md border border-slate-800/70 bg-slate-950/15 p-4">
                <div className="text-sm text-slate-300">
                  Mission history is saved locally in <span className="font-mono">gary-dashboard/data/missions.json</span>.
                </div>
              </div>
            </div>
          ) : tab === "ops" ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                  <Shield className="h-4 w-4 text-sky-300" /> Admin
                  <span className="text-slate-600">(local-only)</span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <input
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="Paste admin key to unlock…"
                      className="w-full rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                    />
                    <div className="mt-2 font-mono text-[10px] uppercase text-slate-600">
                      {adminUnlocked ? "unlocked" : "locked"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={gatewayRestart}
                      className="rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2 text-sm text-slate-100 hover:bg-slate-950/40"
                    >
                      Restart gateway
                    </button>
                    <button
                      onClick={runDoctor}
                      className="rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2 text-sm text-slate-100 hover:bg-slate-950/40"
                    >
                      Run doctor
                    </button>
                  </div>
                </div>

                {adminOut ? (
                  <pre className="mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950/30 p-3 font-mono text-xs text-slate-200">
                    {adminOut}
                  </pre>
                ) : null}
              </div>

              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                    <Terminal className="h-4 w-4 text-sky-300" /> openclaw status
                  </div>
                </div>
                <pre className="mt-3 max-h-[280px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950/30 p-3 font-mono text-xs text-slate-200">
                  {statusText || "(loading…)"}
                </pre>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                    <Wrench className="h-4 w-4 text-sky-300" /> Skills
                    <span className="text-slate-600">({skills.length})</span>
                  </div>
                  <div className="mt-3 max-h-[320px] space-y-2 overflow-auto pr-1">
                    {skills.slice(0, 80).map((s) => (
                      <div
                        key={s.name}
                        className="flex items-start justify-between gap-3 rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{s.emoji ?? "🧩"}</span>
                            <div className="text-sm text-slate-200">{s.name}</div>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{s.description ?? ""}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusPill status={s.eligible ? "busy" : "idle"} />
                          <div className="font-mono text-[10px] uppercase text-slate-600">
                            {s.disabled ? "disabled" : s.eligible ? "ready" : "missing"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                    <CalendarClock className="h-4 w-4 text-sky-300" /> Cron
                    <span className="text-slate-600">({cronJobs.length})</span>
                  </div>
                  <div className="mt-3 max-h-[320px] space-y-2 overflow-auto pr-1">
                    {cronJobs.length ? (
                      cronJobs.map((j) => (
                        <div
                          key={j.id ?? j.name}
                          className="flex items-start justify-between gap-3 rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2"
                        >
                          <div>
                            <div className="text-sm text-slate-200">{j.name ?? j.id}</div>
                            <div className="mt-1 font-mono text-xs text-slate-500">
                              next: {j.state?.nextRunAtMs ? new Date(j.state.nextRunAtMs).toLocaleString() : "(n/a)"}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div
                              className={
                                "rounded-md border px-2 py-1 font-mono text-[10px] uppercase " +
                                (j.enabled
                                  ? "glow-blue border-sky-600/40 bg-sky-500/10 text-sky-200"
                                  : "border-slate-800/70 bg-slate-950/20 text-slate-300")
                              }
                            >
                              {j.enabled ? "enabled" : "disabled"}
                            </div>

                            {adminUnlocked && j.id ? (
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                  onClick={() => cronAction(j.enabled ? "disable" : "enable", j.id!)}
                                  className="rounded border border-slate-800/70 bg-slate-950/20 px-2 py-1 font-mono text-[10px] uppercase text-slate-300 hover:bg-slate-950/40"
                                >
                                  {j.enabled ? "disable" : "enable"}
                                </button>
                                <button
                                  onClick={() => cronAction("run", j.id!)}
                                  className="rounded border border-slate-800/70 bg-slate-950/20 px-2 py-1 font-mono text-[10px] uppercase text-slate-300 hover:bg-slate-950/40"
                                >
                                  run
                                </button>
                                <button
                                  onClick={() => cronAction("remove", j.id!)}
                                  className="rounded border border-slate-800/70 bg-slate-950/20 px-2 py-1 font-mono text-[10px] uppercase text-slate-300 hover:bg-slate-950/40"
                                >
                                  remove
                                </button>
                              </div>
                            ) : (
                              <div className="font-mono text-[10px] uppercase text-slate-600">
                                {j.sessionTarget ?? ""}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">(no cron jobs)</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                  <Bot className="h-4 w-4 text-sky-300" /> Agents
                  <span className="text-slate-600">({agentRows.length})</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {agentRows.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative grid h-9 w-9 place-items-center rounded-md border border-slate-800/70 bg-slate-950/20">
                          <span className="absolute inset-0 rounded-md shadow-[inset_0_0_0_1px_rgba(56,189,248,0.08),0_0_24px_rgba(56,189,248,0.06)]" />
                          <span className="text-sm">{a.identityEmoji ?? "🧰"}</span>
                        </div>
                        <div>
                          <div className="text-sm text-slate-200">{a.identityName ?? a.id}</div>
                          <div className="mt-1 font-mono text-xs text-slate-500">{a.model ?? ""}</div>
                        </div>
                      </div>
                      <div className="font-mono text-[10px] uppercase text-slate-500">
                        {a.isDefault ? "default" : a.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Channels Section */}
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                  <Radio className="h-4 w-4 text-sky-300" /> Channels
                  <span className="text-slate-600">({channels.length})</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {channels.length > 0 ? (
                    channels.map((c: any) => (
                      <div
                        key={c.channel ?? c.id ?? Math.random()}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative grid h-9 w-9 place-items-center rounded-md border border-slate-800/70 bg-slate-950/20">
                            <span className="absolute inset-0 rounded-md shadow-[inset_0_0_0_1px_rgba(56,189,248,0.08),0_0_24px_rgba(56,189,248,0.06)]" />
                            <span className="text-sm">{c.running ? "✅" : "❌"}</span>
                          </div>
                          <div>
                            <div className="text-sm text-slate-200">{c.channel ?? c.id ?? "Unknown"}</div>
                            <div className="mt-1 font-mono text-xs text-slate-500">
                              {c.running ? "running" : "stopped"}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono text-[10px] uppercase text-slate-500">
                          {c.accounts?.length ? `${c.accounts.length} accounts` : ""}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">(no channels configured)</div>
                  )}
                </div>
              </div>
            </div>
          ) : tab === "logs" ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                    <ScrollText className="h-4 w-4 text-sky-300" /> Live Logs
                    {logsStreaming && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={logsFile}
                      onChange={(e) => {
                        setLogsFile(e.target.value as "gateway" | "gateway.err" | "dashboard");
                        setLogsLines([]);
                      }}
                      disabled={logsStreaming}
                      className="rounded-md border border-slate-800/70 bg-slate-950/30 px-2 py-1 text-xs text-slate-200 outline-none focus:border-sky-600/50 disabled:opacity-50"
                    >
                      <option value="gateway">gateway.log</option>
                      <option value="gateway.err">gateway.err.log</option>
                      <option value="dashboard">dashboard.log</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={logsAutoScroll}
                        onChange={(e) => setLogsAutoScroll(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950"
                      />
                      Auto-scroll
                    </label>
                    <button
                      onClick={clearLogs}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-800/70 bg-slate-950/20 px-2 py-1 text-xs text-slate-300 hover:bg-slate-950/40"
                    >
                      <Trash className="h-3.5 w-3.5" /> Clear
                    </button>
                    {!logsStreaming ? (
                      <button
                        onClick={startLogsStream}
                        className="glow-blue inline-flex items-center gap-1 rounded-md border border-sky-700/40 bg-sky-500/10 px-3 py-1 text-xs text-slate-100 hover:bg-sky-500/15"
                      >
                        <Play className="h-3.5 w-3.5" /> Start
                      </button>
                    ) : (
                      <button
                        onClick={stopLogsStream}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-700/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-100 hover:bg-rose-500/15"
                      >
                        <Square className="h-3.5 w-3.5" /> Stop
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 max-h-[600px] overflow-auto rounded-md border border-slate-800/70 bg-slate-950/50 p-3">
                  {logsLines.length === 0 ? (
                    <div className="text-sm text-slate-500">(no logs yet — click Start to stream)</div>
                  ) : (
                    <div className="space-y-0.5">
                      {logsLines.map((line, i) => (
                        <div key={i} className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all">
                          {line}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  )}
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  {logsLines.length} lines {logsLines.length >= 1000 && "(auto-truncated to last 500)"}
                </div>
              </div>
            </div>
          ) : tab === "memory" ? (
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                  <Search className="h-4 w-4 text-sky-300" /> Search Memory
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={memorySearchQuery}
                    onChange={(e) => setMemorySearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchMemory()}
                    placeholder="Search notes, memories, todos..."
                    className="flex-1 rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                  />
                  <button
                    onClick={searchMemory}
                    disabled={memoryLoading || memorySearchQuery.trim().length < 2}
                    className="glow-blue inline-flex items-center gap-2 rounded-md border border-sky-700/40 bg-sky-500/10 px-4 py-2 text-sm text-slate-100 hover:bg-sky-500/15 disabled:opacity-60"
                  >
                    <Search className="h-4 w-4" />
                    {memoryLoading ? "Searching..." : "Search"}
                  </button>
                </div>

                {/* Search results */}
                {memorySearchResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs text-slate-500">
                      {memorySearchResults.length} results
                    </div>
                    {memorySearchResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setTab("memory");
                          loadMemoryFile(r.file);
                          setMemorySearchResults([]);
                        }}
                        className="w-full rounded-md border border-slate-800/70 bg-slate-950/20 p-3 text-left hover:bg-slate-950/30"
                      >
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <FileText className="h-3.5 w-3.5" />
                          {r.file}
                          <span className="text-slate-600">•</span>
                          line {r.line}
                        </div>
                        <div className="mt-1 text-sm text-slate-200">{r.text}</div>
                        <div className="mt-1 whitespace-pre-wrap font-mono text-xs text-slate-500">
                          {r.context}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* File browser */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
                {/* File list */}
                <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                    <Brain className="h-4 w-4 text-sky-300" /> Files
                  </div>
                  <div className="mt-3 space-y-1">
                    {memoryFiles?.main.exists && (
                      <button
                        onClick={() => loadMemoryFile("MEMORY.md")}
                        className={`w-full rounded-md border p-2 text-left text-sm ${
                          selectedMemoryFile === "MEMORY.md"
                            ? "glow-blue border-sky-600/40 bg-sky-500/10 text-slate-200"
                            : "border-slate-800/70 bg-slate-950/20 text-slate-300 hover:bg-slate-950/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          MEMORY.md
                        </div>
                        <div className="mt-1 text-xs text-slate-500">Long-term memory</div>
                      </button>
                    )}

                    <div className="pt-2">
                      <div className="px-2 py-1 text-xs uppercase tracking-wider text-slate-600">
                        Daily Notes
                      </div>
                      {memoryFiles?.daily.map((f) => (
                        <button
                          key={f}
                          onClick={() => loadMemoryFile(f)}
                          className={`w-full rounded-md border p-2 text-left text-sm mt-1 ${
                            selectedMemoryFile === f
                              ? "glow-blue border-sky-600/40 bg-sky-500/10 text-slate-200"
                              : "border-slate-800/70 bg-slate-950/20 text-slate-300 hover:bg-slate-950/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {f}
                          </div>
                        </button>
                      ))}
                    </div>

                    {!memoryFiles && (
                      <div className="text-sm text-slate-500">(loading...)</div>
                    )}
                  </div>
                </div>

                {/* File content */}
                <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                      <FileText className="h-4 w-4 text-sky-300" />
                      {selectedMemoryFile || "Select a file"}
                    </div>
                    {memoryLoading && <span className="text-xs text-slate-500">loading...</span>}
                  </div>
                  <div className="mt-3 max-h-[600px] overflow-auto rounded-md border border-slate-800/70 bg-slate-950/50 p-3">
                    {memoryContent ? (
                      <pre className="whitespace-pre-wrap font-mono text-xs text-slate-300">
                        {memoryContent}
                      </pre>
                    ) : (
                      <div className="text-sm text-slate-500">
                        {memoryFiles
                          ? "Select a file to view contents"
                          : "Loading memory files..."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : tab === "files" ? (
            <div className="flex flex-col gap-4">
              {/* Breadcrumb */}
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-3">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="font-mono text-slate-500">workspace/</span>
                  <span className="font-mono">{filePath}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
                {/* File list */}
                <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                      <FolderOpen className="h-4 w-4 text-sky-300" /> Files
                    </div>
                    <div className="flex items-center gap-2">
                      {fileLoading && <span className="text-xs text-slate-500">...</span>}
                      {!showNewFileInput ? (
                        <button
                          onClick={() => setShowNewFileInput(true)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-800/70 bg-slate-950/20 px-2 py-1 text-xs text-slate-300 hover:bg-slate-950/40"
                        >
                          <Plus className="h-3.5 w-3.5" /> New
                        </button>
                      ) : (
                        <button
                          onClick={() => { setShowNewFileInput(false); setNewFileName(""); }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-800/70 bg-slate-950/20 px-2 py-1 text-xs text-slate-300 hover:bg-slate-950/40"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* New file input */}
                  {showNewFileInput && (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createNewFile()}
                        placeholder="filename.md"
                        autoFocus
                        className="flex-1 rounded-md border border-slate-800/70 bg-slate-950/30 px-2 py-1 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                      />
                      <button
                        onClick={createNewFile}
                        disabled={!newFileName.trim() || fileSaving}
                        className="glow-blue inline-flex items-center gap-1 rounded-md border border-sky-700/40 bg-sky-500/10 px-3 py-1 text-xs text-slate-100 hover:bg-sky-500/15 disabled:opacity-60"
                      >
                        {fileSaving ? "..." : "Create"}
                      </button>
                    </div>
                  )}
                  <div className="mt-3 space-y-1 max-h-[600px] overflow-auto">
                    {filePath !== "." && (
                      <button
                        onClick={() => loadFileList(filePath.split('/').slice(0, -1).join('/') || '.')}
                        className="w-full rounded-md border border-slate-800/70 bg-slate-950/20 p-2 text-left text-sm text-slate-300 hover:bg-slate-950/30"
                      >
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          ..
                        </div>
                      </button>
                    )}
                    {fileList.map((f) => (
                      <button
                        key={f.path}
                        onClick={() => f.type === "dir" ? loadFileList(f.path) : loadFile(f.path)}
                        className={`w-full rounded-md border p-2 text-left text-sm ${
                          selectedFile === f.path
                            ? "glow-blue border-sky-600/40 bg-sky-500/10 text-slate-200"
                            : "border-slate-800/70 bg-slate-950/20 text-slate-300 hover:bg-slate-950/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {f.type === "dir" ? <FolderOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          {f.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* File editor */}
                <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                      <FileText className="h-4 w-4 text-sky-300" />
                      {selectedFile || "Select a file"}
                      {fileDirty && <span className="text-rose-400">*</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {fileLoading && <span className="text-xs text-slate-500">loading...</span>}
                      {selectedFile && (
                        <button
                          onClick={saveFile}
                          disabled={!fileDirty || fileSaving}
                          className="glow-blue inline-flex items-center gap-1 rounded-md border border-sky-700/40 bg-sky-500/10 px-3 py-1 text-xs text-slate-100 hover:bg-sky-500/15 disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {fileSaving ? "Saving..." : "Save"}
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedFile ? (
                    <textarea
                      value={fileContent}
                      onChange={(e) => {
                        setFileContent(e.target.value);
                        setFileDirty(e.target.value !== fileOriginalContent);
                      }}
                      className="mt-3 h-[500px] w-full rounded-md border border-slate-800/70 bg-slate-950/30 p-3 font-mono text-xs text-slate-200 outline-none focus:border-sky-600/50 resize-none"
                      spellCheck={false}
                    />
                  ) : (
                    <div className="mt-3 h-[500px] rounded-md border border-slate-800/70 bg-slate-950/20 p-3 text-sm text-slate-500 flex items-center justify-center">
                      Select a file to edit
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : tab === "bookmarks" ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                  <Bookmark className="h-4 w-4 text-sky-300" /> Add bookmark
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <input
                      value={bmTitle}
                      onChange={(e) => setBmTitle(e.target.value)}
                      placeholder="Title"
                      className="w-full rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                    />
                    <input
                      value={bmUrl}
                      onChange={(e) => setBmUrl(e.target.value)}
                      placeholder="URL (optional)"
                      className="w-full rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                    />
                    <input
                      value={bmTags}
                      onChange={(e) => setBmTags(e.target.value)}
                      placeholder="tags (comma separated)"
                      className="w-full rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <textarea
                      value={bmNote}
                      onChange={(e) => setBmNote(e.target.value)}
                      rows={4}
                      placeholder="Note (optional)"
                      className="w-full rounded-md border border-slate-800/70 bg-slate-950/30 p-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                    />
                    <button
                      onClick={addBookmark}
                      className="glow-blue inline-flex items-center justify-center gap-2 rounded-md border border-sky-700/40 bg-sky-500/10 px-3 py-2 text-sm text-slate-100 hover:bg-sky-500/15"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                  <Tag className="h-4 w-4 text-sky-300" /> Bookmarks
                  <span className="text-slate-600">({bookmarks.length})</span>
                </div>
                <div className="mt-3 space-y-2">
                  {bookmarks.length ? (
                    bookmarks.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-slate-200">{b.title}</div>
                          {b.url ? (
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block truncate font-mono text-xs text-sky-300 hover:underline"
                            >
                              {b.url}
                            </a>
                          ) : null}
                          {b.tags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {b.tags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded border border-slate-800/70 bg-slate-950/20 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-400"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {b.note ? (
                            <div className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{b.note}</div>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => editBookmark(b)}
                            className="rounded border border-slate-800/70 bg-slate-950/20 p-1 text-slate-300 hover:bg-slate-950/40"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteBookmark(b.id)}
                            className="rounded border border-slate-800/70 bg-slate-950/20 p-1 text-slate-300 hover:bg-slate-950/40"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">(no bookmarks yet)</div>
                  )}
                </div>
              </div>
            </div>
          ) : tab === "chat" ? (
            <div className="flex flex-col gap-3 h-[calc(100vh-200px)]">
              {/* Session selector */}
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-3 shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Session Key</div>
                    <div className="flex gap-2">
                      <input
                        value={selectedSessionKey}
                        onChange={(e) => {
                          setSelectedSessionKey(e.target.value);
                          setHistory([]);
                        }}
                        placeholder="agent:main:main or telegram:default:..."
                        className="flex-1 rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-xs font-mono text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                      />
                      <button
                        onClick={() => loadHistory(selectedSessionKey)}
                        className="rounded-md border border-slate-800/70 bg-slate-950/20 px-3 py-2 text-xs text-slate-300 hover:bg-slate-950/40"
                      >
                        Load
                      </button>
                    </div>
                    {selectedSessionId && (
                      <div className="mt-1 font-mono text-[10px] uppercase text-slate-600">
                        id: {selectedSessionId}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-slate-500">
                      For Telegram: try <code className="text-slate-400">telegram:default:YOUR_PHONE</code>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Agent</div>
                    <select
                      value={chatAgentId}
                      onChange={(e) => setChatAgentId(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-600/50"
                    >
                      {agentRows.length ? (
                        agentRows.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.identityName ?? a.id}
                          </option>
                        ))
                      ) : (
                        <option value="main">main</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages - scrollable like Telegram */}
              <div className="flex-1 rounded-md border border-slate-800/70 bg-slate-950/10 p-3 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1" id="chat-messages">
                  {history.length ? (
                    history.map((m, i) => (
                      <div
                        key={i}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            m.role === 'user'
                              ? 'bg-sky-600/20 border border-sky-600/30 text-slate-100'
                              : 'bg-slate-800/50 border border-slate-700/50 text-slate-200'
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            {m.content ?? m.text ?? ""}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500 text-right">
                            {m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">
                      No messages yet. Start chatting!
                    </div>
                  )}
                </div>
              </div>

              {/* Input - fixed at bottom */}
              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-3 shrink-0">
                <div className="flex gap-2">
                  <input
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!chatSending) sendChat();
                      }
                    }}
                    placeholder="Type a message…"
                    className="flex-1 rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-sky-600/50"
                  />
                  <button
                    disabled={chatSending}
                    onClick={sendChat}
                    className={
                      "glow-blue rounded-md border border-sky-700/40 bg-sky-500/10 px-4 py-2 text-sm text-slate-100 hover:bg-sky-500/15 disabled:opacity-60"
                    }
                  >
                    {chatSending ? "…" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-slate-800/70 bg-slate-950/15 p-4">
                <div className="text-sm text-slate-300">
                  Research our top 3 competitors and write a brief analysis report.
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-emerald-300">
                    <CircleCheck className="h-3.5 w-3.5" /> COMPLETED
                  </span>
                  <span>Created now</span>
                  <span>•</span>
                  <span>Started now</span>
                </div>
              </div>

              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="text-xs uppercase tracking-wider text-slate-400">Plan</div>
                <ul className="mt-3 space-y-3">
                  {tasks.map((t) => (
                    <li key={t.title} className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-md border border-slate-800/70 bg-slate-950/20">
                        <CircleCheck className="h-4 w-4 text-emerald-300" />
                      </span>
                      <div className="flex-1 text-sm text-slate-200 line-through decoration-slate-600">
                        {t.title}
                      </div>
                      <div className="text-xs text-slate-500">now</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-4">
                <div className="text-xs uppercase tracking-wider text-slate-400">Notes</div>
                <div className="mt-2 text-sm text-slate-300">
                  Wired: status + sessions + history + send + skills + cron + agents.
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Right */}
        <Panel title="Status" icon={<Bot className="h-4 w-4 text-sky-300" />}>
          <SectionLabel>Needs attention</SectionLabel>
          <div className="mt-3 rounded-md border border-slate-800/70 bg-slate-950/10 p-4 text-sm text-slate-400">
            No checkpoints waiting
          </div>

          <div className="mt-6">
            <SectionLabel>Agents</SectionLabel>
            <div className="mt-3 space-y-2">
              {agents.map((a) => (
                <div
                  key={a.name}
                  className="flex items-center justify-between rounded-md border border-slate-800/70 bg-slate-950/10 px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative grid h-9 w-9 place-items-center rounded-md border border-slate-800/70 bg-slate-950/20">
                      <span className="absolute inset-0 rounded-md shadow-[inset_0_0_0_1px_rgba(56,189,248,0.08),0_0_24px_rgba(56,189,248,0.06)]" />
                      {agentIcon(a.name)}
                    </div>
                    <div>
                      <div className="text-sm text-slate-200">{a.name}</div>
                      <div className="text-xs text-slate-500">Local agent</div>
                    </div>
                  </div>
                  <StatusPill status={a.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <SectionLabel>Activity</SectionLabel>
            <div className="mt-3 space-y-2">
              <ActivityItem time="05:53 PM" text="Task completed" />
              <ActivityItem time="05:53 PM" text="Mission completed!" />
              <ActivityItem time="05:51 PM" text="Task dispatched" />
              <ActivityItem time="05:46 PM" text="Task completed" />
            </div>
          </div>
        </Panel>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-10">
        <div className="text-xs text-slate-600">
          Wired: status + sessions + history + send + skills + cron + agents. Secure by default: bind 127.0.0.1.
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "relative inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition " +
        (active
          ? "glow-blue border-sky-600/40 bg-sky-500/10 text-slate-50"
          : "border-slate-800/70 bg-slate-950/20 text-slate-300 hover:bg-slate-950/40")
      }
    >
      {active ? (
        <span className="absolute -bottom-[9px] left-3 right-3 h-px bg-sky-400/70 shadow-[0_0_18px_rgba(56,189,248,0.65)]" />
      ) : null}
      {children}
    </button>
  );
}

function Panel({
  title,
  icon,
  actions,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-gradient-to-b from-slate-950/30 to-slate-950/10 shadow-[0_0_0_1px_rgba(2,6,23,0.4),0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-sm font-semibold tracking-wide text-slate-100">{title}</div>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
      {children}
    </div>
  );
}

function MissionCard({
  title,
  progress,
  status,
}: {
  title: string;
  progress: number;
  status: "running" | "completed";
}) {
  return (
    <div className="rounded-md border border-slate-800/70 bg-slate-950/10 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-200">{title}</div>
        <span
          className={
            "text-[10px] uppercase tracking-wider " +
            (status === "completed" ? "text-emerald-300" : "text-sky-300")
          }
        >
          {status}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-slate-800/60">
        <div
          className="h-full bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-slate-500">COMPLETED {progress}%</div>
    </div>
  );
}

function StatusPill({ status }: { status: "idle" | "busy" | "offline" }) {
  const styles =
    status === "idle"
      ? "border-slate-800/70 bg-slate-950/20 text-slate-300"
      : status === "busy"
        ? "glow-blue border-sky-600/40 bg-sky-500/10 text-sky-200"
        : "border-rose-600/40 bg-rose-500/10 text-rose-200";

  return (
    <div className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase ${styles}`}>
      {status}
    </div>
  );
}

function agentIcon(name: string) {
  switch (name.toLowerCase()) {
    case "analyst":
      return <FlaskConical className="relative h-4 w-4 text-slate-200" />;
    case "coder":
      return <Terminal className="relative h-4 w-4 text-slate-200" />;
    case "planner":
      return <PenTool className="relative h-4 w-4 text-slate-200" />;
    case "researcher":
      return <BadgeCheck className="relative h-4 w-4 text-slate-200" />;
    default:
      return <Bot className="relative h-4 w-4 text-slate-200" />;
  }
}

function ActivityItem({ time, text }: { time: string; text: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-800/70 bg-slate-950/10 px-3 py-2 font-mono text-xs">
      <div className="text-slate-500">{time}</div>
      <div className="text-slate-300">{text}</div>
    </div>
  );
}
