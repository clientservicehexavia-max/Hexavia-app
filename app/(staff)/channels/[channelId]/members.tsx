// app/(staff)/channels/[channelId]/members.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    CalendarDays,
    FileText,
    FolderOpen,
    Plus,
    Share2,
    ShieldCheck,
    UserMinus,
    UsersRound,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { api } from "@/api/axios";
import OptionSheet from "@/components/common/OptionSheet";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { PRIMARY } from "@/constants/Colors";
import { selectAdminUsers } from "@/redux/admin/admin.slice";
import {
    adminAddChannelMember,
    fetchAdminUsers,
} from "@/redux/admin/admin.thunks";
import type { ChannelLink } from "@/redux/channelLinks/channelLinks.types";
import type { ChannelNote } from "@/redux/channelNotes/channelNotes.types";
import { selectChannelById } from "@/redux/channels/channels.selectors";
import {
    fetchChannelById,
    removeMemberFromChannel,
} from "@/redux/channels/channels.thunks";
import type { ChannelResource } from "@/redux/channels/resources.types";
import { selectUser } from "@/redux/user/user.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { isAdminLikeRole } from "@/utils/roles";

type MemberItem = {
    id: string;
    username: string;
    avatar?: string | null;
    role?: string | null;
    channelType?: string | null;
};

type SummaryPdfResponse = {
    success?: boolean;
    pdfUrl?: string;
    summaryText?: string;
    message?: string;
    filename?: string;
};

function initialsFrom(value?: string | null) {
    const s = String(value ?? "").trim();
    if (!s) return "??";
    const [a, b] = s.split(/\s+/);
    return ((a?.[0] ?? "") + (b?.[0] ?? "")).toUpperCase() || "?";
}

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <View className="bg-white/20 rounded-full px-3 py-1.5 mr-2 mb-2 border border-white/20">
            <Text className="text-xs text-white font-kumbh">{children}</Text>
        </View>
    );
}

function formatRole(role?: string | null) {
    const value = String(role || "member").trim();
    if (!value) return "Member";
    return value
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function StatTile({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <View className="flex-1 min-w-[96px] rounded-2xl bg-white border border-gray-100 px-4 py-3">
            <View className="flex-row items-center">
                <View className="h-8 w-8 rounded-full bg-[#EEF2FF] items-center justify-center mr-2">
                    {icon}
                </View>
                <Text
                    className="text-xs text-gray-500 font-kumbh flex-1"
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </View>
            <Text
                className="mt-3 text-lg text-gray-950 font-kumbhBold"
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
}

function ActionButton({
    label,
    icon,
    onPress,
    variant = "light",
    disabled,
}: {
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    variant?: "primary" | "light";
    disabled?: boolean;
}) {
    const isPrimary = variant === "primary";
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            className={`flex-1 min-h-[48px] rounded-2xl px-4 flex-row items-center justify-center ${
                isPrimary ? "bg-primary" : "bg-white border border-gray-100"
            }`}
            style={{
                opacity: disabled ? 0.72 : 1,
                shadowColor: "#111827",
                shadowOpacity: isPrimary ? 0.12 : 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: isPrimary ? 3 : 1,
            }}
        >
            {icon}
            <Text
                className={`ml-2 text-sm font-kumbhBold ${
                    isPrimary ? "text-white" : "text-gray-900"
                }`}
                numberOfLines={1}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function fmtDate(d?: string | Date | null) {
    if (!d) return "—";
    const date = typeof d === "string" ? new Date(d) : d;
    if (!date || Number.isNaN(date.getTime())) return "—";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function escapeHtml(input?: string | number | null) {
    if (input === null || input === undefined) return "";
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function statusBadgeColor(s?: string) {
    switch (String(s || "").toLowerCase()) {
        case "completed":
            return "#16a34a";
        case "in-progress":
            return "#f59e0b";
        case "not-started":
            return "#9ca3af";
        case "canceled":
            return "#ef4444";
        default:
            return "#6b7280";
    }
}

function detectResourceCategory(resource: ChannelResource) {
    const explicit = String(resource.category ?? "").toLowerCase();
    if (explicit) return explicit;
    const mime = String(resource.mime || resource.mimetype || "").toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    if (mime.includes("pdf") || mime.includes("document")) return "document";
    const name = String(resource.name || "").toLowerCase();
    const url = String(resource.resourceUpload || "").toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(name + url)) return "image";
    if (/\.(mp3|wav|m4a|aac|ogg)$/.test(name + url)) return "audio";
    if (/\.(mp4|mov|avi|mkv|webm)$/.test(name + url)) return "video";
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/.test(name + url))
        return "document";
    return "other";
}

function resolvePdfUrl(pathOrUrl: string) {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const base = (api.defaults.baseURL ?? "").replace(/\/+$/, "");
    const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${base}${path}`;
}

function htmlForSingleChannelReport(payload: {
    channelName: string;
    channelCode?: string;
    generatedAt: Date;
    createdAt?: string;
    createdBy?: string;
    members: MemberItem[];
    tasks: {
        _id: string;
        name: string;
        description?: string | null;
        status?: string;
        createdAt?: string;
        updatedAt?: string;
        dueDate?: string;
        due_date?: string;
    }[];
    resources: ChannelResource[];
    links: ChannelLink[];
    notes: ChannelNote[];
}) {
    const {
        channelName,
        channelCode,
        generatedAt,
        createdAt,
        createdBy,
        members,
        tasks,
        resources,
        links,
        notes,
    } = payload;

    const taskRows =
        tasks.length > 0
            ? tasks
                  .map((t, i) => {
                      const due = t.dueDate || t.due_date;
                      return `
              <tr>
                <td>${i + 1}</td>
                <td class="task-title">${escapeHtml(t.name || "Untitled Task")}</td>
                <td><span class="status-pill" style="background:${statusBadgeColor(
                    t.status,
                )};color:#fff;">${escapeHtml(t.status || "unknown")}</span></td>
                <td>${escapeHtml(fmtDate(t.createdAt))}</td>
                <td>${escapeHtml(fmtDate(t.updatedAt))}</td>
                <td>${escapeHtml(fmtDate(due))}</td>
                <td>${escapeHtml(t.description || "—")}</td>
              </tr>
            `;
                  })
                  .join("")
            : `<tr><td colspan="7" class="empty-row">No tasks found.</td></tr>`;

    const resourceRows =
        resources.length > 0
            ? resources
                  .map(
                      (r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(r.name || "Untitled")}</td>
                <td>${escapeHtml(detectResourceCategory(r))}</td>
                <td>${escapeHtml(r.description || "—")}</td>
                <td>${escapeHtml(r.resourceUpload || "—")}</td>
              </tr>
            `,
                  )
                  .join("")
            : `<tr><td colspan="5" class="empty-row">No resources found.</td></tr>`;

    const linksMarkup =
        links.length > 0
            ? links
                  .map(
                      (l) => `
              <li class="ln-item">
                <div class="ln-title">${escapeHtml(l.title || "Link")}</div>
                <div class="ln-url">${escapeHtml(l.url)}</div>
                ${
                    l.description
                        ? `<div class="ln-desc">${escapeHtml(l.description)}</div>`
                        : ""
                }
              </li>
            `,
                  )
                  .join("")
            : `<li class="ln-empty">No links</li>`;

    const notesMarkup =
        notes.length > 0
            ? notes
                  .map(
                      (n) => `
              <li class="ln-item">
                <div class="ln-title">${escapeHtml(n.title || "Untitled Note")}</div>
                <div class="ln-desc">${escapeHtml(n.description || "—")}</div>
              </li>
            `,
                  )
                  .join("")
            : `<li class="ln-empty">No notes</li>`;

    const memberMarkup =
        members.length > 0
            ? members
                  .map(
                      (m) =>
                          `<span class="member-chip">${escapeHtml(m.username || "Member")}</span>`,
                  )
                  .join("")
            : `<span class="ln-empty">No members found</span>`;

    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const notStarted = tasks.filter((t) => t.status === "not-started").length;
    const canceled = tasks.filter((t) => t.status === "canceled").length;

    const narrativeLines = (() => {
        if (!tasks.length) {
            return [
                "No tasks were recorded for this project in the selected period.",
                "Add tasks with owners and due dates to improve tracking.",
            ];
        }
        const completionRate = tasks.length
            ? Math.round((completed / tasks.length) * 100)
            : 0;
        return [
            `This report summarizes ${tasks.length} task${tasks.length === 1 ? "" : "s"} for ${escapeHtml(channelName)}.`,
            `${completed} completed, ${inProgress} in progress, ${notStarted} not started, and ${canceled} canceled.`,
            `Completion rate is ${completionRate}%.`,
            `${resources.length} resource${resources.length === 1 ? "" : "s"}, ${links.length} link${links.length === 1 ? "" : "s"}, and ${notes.length} note${notes.length === 1 ? "" : "s"} were logged.`,
        ];
    })();

    const nextSteps = (() => {
        const steps: string[] = [];
        if (notStarted > 0)
            steps.push("Prioritize not-started tasks and assign owners.");
        if (inProgress > 0)
            steps.push("Review in-progress tasks for blockers.");
        if (canceled > 0)
            steps.push("Revisit canceled items to confirm scope changes.");
        steps.push("Confirm upcoming milestones and due dates.");
        return steps;
    })();

    const contextObjectives = [
        "Summarize project execution in plain language for stakeholders.",
        "Highlight delivery momentum, risks, and resource activity.",
        "Provide a clear next‑step plan for the upcoming period.",
    ];

    const highlights = (() => {
        if (!tasks.length) {
            return [
                "No activity recorded in the selected period.",
                "Consider broadening the date range to capture milestones.",
            ];
        }
        const items: string[] = [];
        if (completed > 0)
            items.push(
                `${completed} task${completed === 1 ? "" : "s"} completed.`,
            );
        if (inProgress > 0)
            items.push(
                `${inProgress} task${inProgress === 1 ? "" : "s"} in progress.`,
            );
        if (resources.length > 0)
            items.push(
                `${resources.length} resource${resources.length === 1 ? "" : "s"} uploaded.`,
            );
        return items;
    })();

    const risks = (() => {
        const items: string[] = [];
        if (notStarted > 0)
            items.push(
                `${notStarted} task${notStarted === 1 ? "" : "s"} not started yet.`,
            );
        if (canceled > 0)
            items.push(
                `${canceled} task${canceled === 1 ? "" : "s"} canceled.`,
            );
        if (items.length === 0)
            items.push("No critical risks identified in this period.");
        return items;
    })();

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Channel Report</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial, sans-serif;
    background: #eef2ff;
    color: #111827;
    margin: 0;
  }
  .page {
    width: 100%;
    padding: 32px 24px 48px;
  }
  .report-surface {
    max-width: 1020px;
    margin: 0 auto;
    background: #fff;
    border-radius: 32px;
    padding: 32px;
    box-shadow: 0 25px 60px rgba(15, 23, 42, 0.15);
  }
  .report-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-start;
  }
  .h1 {
    font-size: 26px;
    margin: 0;
    font-weight: 700;
  }
  .brand-subtitle {
    color: #6b7280;
    font-size: 14px;
    margin-top: 4px;
  }
  .header-chips {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
  }
  .chip {
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #eef2ff;
    color: #312e81;
  }
  .chip.subtle {
    background: #f3f4f6;
    color: #4b5563;
  }
  .report-meta {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px 20px;
    font-size: 13px;
    color: #475467;
  }
  .member-row {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .member-chip {
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 12px;
    background: #f1f5f9;
    color: #0f172a;
  }
  .stat-grid {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 14px;
  }
  .stat-card {
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    padding: 14px;
    background: #f9fafb;
  }
  .stat-card .label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
  }
  .stat-card .value {
    margin-top: 8px;
    font-size: 22px;
    font-weight: 700;
    color: #111827;
  }
  .narrative {
    margin-top: 20px;
    padding: 16px 18px;
    border-radius: 20px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    color: #1f2937;
    font-size: 13px;
    line-height: 1.55;
  }
  .snapshot-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 12px;
  }
  .snapshot-table td {
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    background: #fff;
  }
  .snapshot-table td.label {
    color: #6b7280;
    width: 45%;
    font-weight: 600;
  }
  .narrative h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #374151;
  }
  .narrative ul {
    margin: 8px 0 0 16px;
    padding: 0;
  }
  .narrative li {
    margin-bottom: 6px;
  }
  .section {
    margin-top: 32px;
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    font-size: 16px;
  }
  .muted {
    color: #6b7280;
    font-size: 12px;
  }
  .table-wrapper {
    margin-top: 12px;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead {
    background: #111827;
    color: #fff;
  }
  th {
    padding: 12px;
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  td {
    padding: 11px 12px;
    border-bottom: 1px solid #e5e7eb;
    color: #1f2937;
    vertical-align: middle;
  }
  tbody tr:nth-child(odd) {
    background: #f8fafc;
  }
  .task-title {
    font-weight: 600;
    color: #0f172a;
  }
  .status-pill {
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 11px;
    text-transform: capitalize;
    letter-spacing: 0.04em;
    display: inline-flex;
    align-items: center;
  }
  .empty-row {
    text-align: center;
    padding: 24px 0;
    color: #6b7280;
  }
  .ln-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
  }
  .ln-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    padding: 14px 16px;
  }
  .ln-subtitle {
    font-size: 12px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .ln-list {
    margin: 0;
    padding-left: 16px;
  }
  .ln-item {
    margin-bottom: 8px;
  }
  .ln-title {
    font-weight: 600;
    color: #111827;
    margin-bottom: 2px;
  }
  .ln-url {
    font-size: 12px;
    color: #2563eb;
    word-break: break-all;
  }
  .ln-desc {
    font-size: 12px;
    color: #6b7280;
  }
  .ln-empty {
    font-size: 12px;
    color: #9ca3af;
  }
  .footer {
    margin-top: 32px;
    font-size: 11px;
    color: #6b7280;
    letter-spacing: 0.08em;
    text-align: right;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="report-surface">
      <div class="report-header">
        <div>
          <div class="h1">Project Work Report</div>
          <div class="brand-subtitle">${escapeHtml(channelName)}</div>
        </div>
        <div class="header-chips">
          <div class="chip">HEXAVIA</div>
          <div class="chip subtle">Single Project</div>
        </div>
      </div>

      <div class="report-meta">
        <div><strong>Project:</strong> ${escapeHtml(channelName)}</div>
        <div><strong>Code:</strong> ${escapeHtml(channelCode || "—")}</div>
        <div><strong>Owner:</strong> ${escapeHtml(createdBy || "—")}</div>
        <div><strong>Created:</strong> ${escapeHtml(fmtDate(createdAt))}</div>
        <div><strong>Generated:</strong> ${escapeHtml(fmtDate(generatedAt))}</div>
      </div>

      <div class="member-row">
        ${memberMarkup}
      </div>

      <div class="narrative">
        <h3>1. Executive Summary</h3>
        ${narrativeLines.map((line) => `<div>${line}</div>`).join("")}

        <h3 style="margin-top:14px;">High-level Status Snapshot</h3>
        <table class="snapshot-table">
          <tr><td class="label">Completion rate</td><td>${tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%</td></tr>
          <tr><td class="label">In progress</td><td>${inProgress}</td></tr>
          <tr><td class="label">Not started</td><td>${notStarted}</td></tr>
          <tr><td class="label">Resources logged</td><td>${resources.length}</td></tr>
        </table>

        <h3 style="margin-top:14px;">2. Project Context & Objectives</h3>
        <ul>
          ${contextObjectives.map((line) => `<li>${line}</li>`).join("")}
        </ul>

        <h3 style="margin-top:14px;">3. Highlights</h3>
        <ul>
          ${highlights.map((line) => `<li>${line}</li>`).join("")}
        </ul>

        <h3 style="margin-top:14px;">4. Risks & Blockers</h3>
        <ul>
          ${risks.map((line) => `<li>${line}</li>`).join("")}
        </ul>

        <h3 style="margin-top:14px;">5. Next Steps</h3>
        <ul>
          ${nextSteps.map((step) => `<li>${step}</li>`).join("")}
        </ul>
      </div>

      <div class="stat-grid">
        <div class="stat-card"><div class="label">Total Tasks</div><div class="value">${tasks.length}</div></div>
        <div class="stat-card"><div class="label">Completed</div><div class="value">${completed}</div></div>
        <div class="stat-card"><div class="label">In Progress</div><div class="value">${inProgress}</div></div>
        <div class="stat-card"><div class="label">Not Started</div><div class="value">${notStarted}</div></div>
        <div class="stat-card"><div class="label">Canceled</div><div class="value">${canceled}</div></div>
        <div class="stat-card"><div class="label">Resources</div><div class="value">${resources.length}</div></div>
        <div class="stat-card"><div class="label">Links</div><div class="value">${links.length}</div></div>
        <div class="stat-card"><div class="label">Notes</div><div class="value">${notes.length}</div></div>
      </div>

      <div class="section">
        <div class="section-heading">
          <div>Tasks</div>
          <div class="muted">Task board snapshot</div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Task</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Due</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>${taskRows}</tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-heading">
          <div>Resources</div>
          <div class="muted">Uploaded files and media</div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Category</th>
                <th>Description</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>${resourceRows}</tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-heading">
          <div>Links & Notes</div>
          <div class="muted">Knowledge captured in channel</div>
        </div>
        <div class="ln-grid">
          <div class="ln-card">
            <div class="ln-subtitle">Links</div>
            <ul class="ln-list">${linksMarkup}</ul>
          </div>
          <div class="ln-card">
            <div class="ln-subtitle">Notes</div>
            <ul class="ln-list">${notesMarkup}</ul>
          </div>
        </div>
      </div>

      <div class="footer">Hexavia • Auto-generated channel report</div>
    </div>
  </div>
</body>
</html>`;
}

function RowMember({
    item,
    onPress,
    onRemove,
    canRemove,
    isRemoving,
}: {
    item: MemberItem;
    onPress?: () => void;
    onRemove?: () => void;
    canRemove?: boolean;
    isRemoving?: boolean;
}) {
    const displayRole = formatRole(item.role);
    const isAdminLike = [
        "admin",
        "super-admin",
        "supervisor",
        "clientservice",
        "owner",
    ].includes(String(item.role || "").toLowerCase());

    return (
        <View className="mx-5 mb-3 rounded-3xl bg-white border border-gray-100 px-4 py-3 flex-row items-center">
            <Pressable
                onPress={onPress}
                className="flex-row items-center flex-1 active:bg-gray-50"
                disabled={!onPress}
            >
                {item.avatar ? (
                    <Image
                        source={{ uri: item.avatar }}
                        className="w-12 h-12 rounded-2xl"
                    />
                ) : (
                    <View className="w-12 h-12 rounded-2xl bg-[#EEF2FF] items-center justify-center">
                        <Text className="text-[#4C5FAB] font-kumbhBold">
                            {initialsFrom(item.username)}
                        </Text>
                    </View>
                )}
                <View className="ml-3 flex-1">
                    <Text
                        className="text-base text-gray-950 font-kumbhBold"
                        numberOfLines={1}
                    >
                        {item.username || "Member"}
                    </Text>
                    <View className="mt-1 flex-row items-center">
                        {isAdminLike && (
                            <ShieldCheck
                                size={13}
                                color={PRIMARY}
                                style={{ marginRight: 4 }}
                            />
                        )}
                        <Text className="text-xs text-gray-500 font-kumbh">
                            {displayRole}
                        </Text>
                    </View>
                </View>
            </Pressable>

            {canRemove && (
                <Pressable
                    onPress={onRemove}
                    disabled={isRemoving}
                    className="h-10 w-10 bg-red-50 rounded-full items-center justify-center active:bg-red-100"
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.username || "member"}`}
                >
                    {isRemoving ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                        <UserMinus size={17} color="#dc2626" />
                    )}
                </Pressable>
            )}
        </View>
    );
}

export default function ChannelInfoScreen() {
    const { channelId: rawId } = useLocalSearchParams<{ channelId: string }>();
    const channelId = typeof rawId === "string" ? rawId : rawId?.[0];

    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const router = useRouter();

    const me = useAppSelector(selectUser);

    const channelSel = useMemo(
        () => selectChannelById(channelId ?? ""),
        [channelId],
    );
    const channel = useAppSelector(channelSel);
    const [refreshing, setRefreshing] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [isAddSheetVisible, setAddSheetVisible] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const onRefresh = useCallback(async () => {
        if (!channelId) return;
        setRefreshing(true);
        try {
            await dispatch(fetchChannelById(channelId)).unwrap();
        } finally {
            setRefreshing(false);
        }
    }, [dispatch, channelId]);

    const meRole = (me?.role ?? "").toLowerCase();
    const canManageMembers = isAdminLikeRole(meRole);
    const meId = me?._id ? String(me._id) : null;
    const adminUsers = useAppSelector(selectAdminUsers);
    const isAddingMember = useAppSelector((state) => state.admin.addingMember);

    const tryRemoveMember = useCallback(
        async (member: MemberItem) => {
            if (!channelId) return;
            const rawType = (member.channelType || "normal").toLowerCase();
            const type = rawType === "member" ? "normal" : rawType;
            setRemovingId(member.id);
            try {
                await dispatch(
                    removeMemberFromChannel({
                        channelId,
                        userId: member.id,
                        type,
                    }),
                ).unwrap();
            } catch (err) {
                console.warn("[channel/remove-member] failed", err);
            } finally {
                setRemovingId(null);
            }
        },
        [dispatch, channelId],
    );

    const confirmRemove = useCallback(
        (member: MemberItem) => {
            if (!member?.id || !channelId) return;
            Alert.alert(
                "Remove member",
                `Remove ${member.username || "this member"} from the channel?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Remove",
                        style: "destructive",
                        onPress: () => tryRemoveMember(member),
                    },
                ],
            );
        },
        [channelId, tryRemoveMember],
    );

    useEffect(() => {
        if (!canManageMembers) return;
        dispatch(fetchAdminUsers());
    }, [canManageMembers, dispatch]);

    const members: MemberItem[] = useMemo(() => {
        if (!channel) return [];

        const rawMembers = Array.isArray((channel as any)?.members)
            ? (channel as any).members
            : [];

        if (rawMembers.length > 0) {
            const mapped: MemberItem[] = rawMembers.map(
                (m: any, idx: number) => {
                    const source = m?._id ?? m ?? {};
                    const userId =
                        source?._id ??
                        source?.id ??
                        m?.userId ??
                        m?.memberId ??
                        `member-${idx}`;
                    const rawType = m?.type ?? m?.memberType ?? "normal";
                    const username =
                        source?.username ??
                        source?.name ??
                        source?.email ??
                        source?.displayName ??
                        `member-${idx}`;
                    return {
                        id: String(userId),
                        username,
                        avatar:
                            source?.profilePicture ?? source?.avatar ?? null,
                        role: source?.role ?? m?.role ?? "member",
                        channelType: rawType ? String(rawType) : null,
                    };
                },
            );
            const seen = new Set<string>();
            const deduped: MemberItem[] = [];
            for (const curr of mapped) {
                const id = curr.id || `member-${deduped.length}`;
                if (seen.has(id)) continue;
                seen.add(id);
                deduped.push({ ...curr, id });
            }
            return deduped;
        }

        const byId = new Map<string, MemberItem>();

        const cb = (channel as any).createdBy;
        if (cb) {
            const id = String(typeof cb === "string" ? cb : (cb?._id ?? ""));
            if (id) {
                byId.set(id, {
                    id,
                    username:
                        (typeof cb === "string"
                            ? "Owner"
                            : cb?.username ||
                              cb?.name ||
                              cb?.email ||
                              "Owner") + " (Owner)",
                    avatar: (cb as any)?.profilePicture ?? null,
                    role: "owner",
                });
            }
        }

        const resArr: any[] = Array.isArray((channel as any)?.resources)
            ? (channel as any).resources
            : [];
        for (const r of resArr) {
            const uid = r?.addedBy ? String(r.addedBy) : "";
            if (!uid) continue;
            if (!byId.has(uid)) {
                byId.set(uid, {
                    id: uid,
                    username:
                        uid === (typeof cb === "string" ? cb : cb?._id)
                            ? (cb?.username ||
                                  cb?.name ||
                                  cb?.email ||
                                  "Owner") + " (Owner)"
                            : "Admin",
                    avatar: null,
                    role: "admin",
                });
            }
        }

        if (me?._id && !byId.has(String(me._id))) {
            byId.set(String(me._id), {
                id: String(me._id),
                username: me?.fullname || me?.username || me?.email || "You",
                avatar: (me as any)?.profilePicture ?? null,
                role: "you",
            });
        }

        return Array.from(byId.values());
    }, [channel, me]);

    const availableAddUsers = useMemo(() => {
        const memberIds = new Set(members.map((m) => m.id));
        return adminUsers.filter(
            (user) => user?._id && !memberIds.has(String(user._id)),
        );
    }, [adminUsers, members]);

    const addUserOptions = useMemo(() => {
        return availableAddUsers.map((user) => {
            const displayRole = user.role ?? "member";
            const displayName =
                user.fullname || user.username || user.email || "User";
            return {
                value: user._id,
                label: `${displayName} (${displayRole})`,
            };
        });
    }, [availableAddUsers]);

    const handleOpenAddMember = useCallback(() => {
        if (addUserOptions.length === 0) {
            Alert.alert(
                "No users available",
                "All fetched users already belong to this channel.",
            );
            return;
        }
        setAddSheetVisible(true);
    }, [addUserOptions.length]);

    const handleAddMember = useCallback(
        async (value: string | number) => {
            if (!channelId) return;
            const channelCode = (channel as any)?.code ?? channelId;
            if (!channelCode) {
                Alert.alert(
                    "Missing channel code",
                    "Cannot add members because the channel has no code.",
                );
                return;
            }

            try {
                await dispatch(
                    adminAddChannelMember({
                        code: String(channelCode),
                        userId: String(value),
                        type: "pm",
                        channelId: String(channelId),
                    }),
                ).unwrap();
                await dispatch(fetchChannelById(channelId)).unwrap();
            } catch (err) {
                console.warn("[admin/add-channel-member] failed", err);
            }
        },
        [channel, channelId, dispatch],
    );

    const isLoading = !channel && !!channelId;
    const ownerName =
        typeof (channel as any)?.createdBy === "string"
            ? (channel as any).createdBy
            : (channel as any)?.createdBy?.username ||
              (channel as any)?.createdBy?.name ||
              "Unknown";
    const createdDate = (channel as any)?.createdAt
        ? new Date((channel as any).createdAt).toLocaleDateString()
        : "—";

    const handleGenerateReport = useCallback(async () => {
        if (!channelId || !channel) return;

        setIsGeneratingReport(true);
        try {
            const endpointResponse = await api.post<SummaryPdfResponse>(
                `/channel/${channelId}/summary-pdf`,
                {},
                { timeout: 120_000 }, // 2 minutes for report generation (includes AI summary + PDF)
            );
            if (!endpointResponse.data?.success) {
                throw new Error(
                    endpointResponse.data?.message ||
                        "Summary generation failed.",
                );
            }

            router.push({
                pathname: "/(admin)/report/[channelId]" as any,
                params: {
                    channelId,
                    title: `Export Report - ${channel.name || "Channel"}`,
                },
            });
            return;
        } catch (endpointErr: any) {
            // Local HTML fallback commented out — navigate failure is reported.
            /*
            try {
                const latestChannel = await dispatch(
                    fetchChannelById(channelId),
                ).unwrap();
                const [links, notes] = await Promise.all([
                    dispatch(fetchChannelLinks(channelId))
                        .unwrap()
                        .catch(() => [] as ChannelLink[]),
                    dispatch(fetchChannelNotes(channelId))
                        .unwrap()
                        .catch(() => [] as ChannelNote[]),
                ]);

                const ownerName =
                    typeof (latestChannel as any)?.createdBy === "string"
                        ? String((latestChannel as any).createdBy)
                        : (latestChannel as any)?.createdBy?.username ||
                          (latestChannel as any)?.createdBy?.name ||
                          (latestChannel as any)?.createdBy?.email ||
                          "Unknown";

                const html = htmlForSingleChannelReport({
                    channelName: latestChannel.name || "Channel",
                    channelCode: (latestChannel as any)?.code,
                    generatedAt: new Date(),
                    createdAt: (latestChannel as any)?.createdAt,
                    createdBy: ownerName,
                    members,
                    tasks: Array.isArray((latestChannel as any)?.tasks)
                        ? ((latestChannel as any).tasks as any[])
                        : [],
                    resources: Array.isArray((latestChannel as any)?.resources)
                        ? ((latestChannel as any)
                              .resources as ChannelResource[])
                        : [],
                    links: Array.isArray(links) ? links : [],
                    notes: Array.isArray(notes) ? notes : [],
                });

                if (Platform.OS === "web") {
                    await Print.printAsync({ html });
                } else {
                    const file = await Print.printToFileAsync({ html });
                    const safeName = slugifyFilename(
                        latestChannel.name || "Project",
                    );
                    const stamp = new Date().toISOString().slice(0, 10);
                    const namedUri = `${FileSystem.cacheDirectory}${safeName}_${stamp}.pdf`;
                    try {
                        await FileSystem.moveAsync({ from: file.uri, to: namedUri });
                    } catch {
                        // keep original uri if rename fails
                    }
                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                        await Sharing.shareAsync(
                            (await FileSystem.getInfoAsync(namedUri)).exists
                                ? namedUri
                                : file.uri,
                            {
                                UTI: "com.adobe.pdf",
                                mimeType: "application/pdf",
                                dialogTitle: `Export Report - ${latestChannel.name || "Channel"}`,
                            },
                        );
                    }
                }
            } catch (fallbackErr: any) {
                // fallback suppressed during refactor
            }
            */

            Alert.alert(
                "Generate report failed",
                endpointErr?.message ||
                    endpointErr?.response?.data?.message ||
                    String(endpointErr) ||
                    "Please try again.",
            );
        } finally {
            setIsGeneratingReport(false);
        }
    }, [channelId, channel, router]);

    const header = (
        <View className="px-5 pt-4 pb-5">
            <View
                className="rounded-[28px] bg-primary p-5 overflow-hidden"
                style={{
                    shadowColor: "#111827",
                    shadowOpacity: 0.14,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: 4,
                }}
            >
                <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                        <Text className="text-white/75 text-xs uppercase tracking-wider font-kumbhBold">
                            Project Channel
                        </Text>
                        <Text
                            className="mt-2 text-2xl text-white font-kumbhBold"
                            numberOfLines={2}
                        >
                            {channel?.name ?? "Channel"}
                        </Text>
                    </View>

                    {!!(channel as any)?.code && (
                        <View className="rounded-2xl bg-white/15 px-3 py-2 border border-white/15">
                            <Text className="text-white/70 text-[10px] uppercase font-kumbhBold">
                                Code
                            </Text>
                            <Text className="text-white text-sm font-kumbhBold">
                                {(channel as any).code}
                            </Text>
                        </View>
                    )}
                </View>

                {!!channel?.description && (
                    <Text
                        className="mt-4 text-white/85 leading-5 font-kumbh"
                        numberOfLines={3}
                    >
                        {channel.description}
                    </Text>
                )}

                <View className="flex-row flex-wrap mt-5">
                    <Chip>
                        {members.length} member{members.length === 1 ? "" : "s"}
                    </Chip>
                    {(channel as any)?.createdAt ? (
                        <Chip>Created {createdDate}</Chip>
                    ) : null}
                    {(channel as any)?.createdBy ? (
                        <Chip>Owner: {ownerName}</Chip>
                    ) : null}
                </View>
            </View>

            <View className="flex-row gap-3 mt-4">
                <StatTile
                    icon={<UsersRound size={16} color={PRIMARY} />}
                    label="Members"
                    value={String(members.length)}
                />
                <StatTile
                    icon={<CalendarDays size={16} color={PRIMARY} />}
                    label="Created"
                    value={createdDate}
                />
            </View>

            <View className="flex-row gap-3 mt-4">
                <ActionButton
                    label="Resources"
                    icon={<FolderOpen size={18} color="#ffffff" />}
                    variant="primary"
                    onPress={() =>
                        router.push({
                            pathname:
                                "/(staff)/channels/[channelId]/resources" as any,
                            params: { channelId },
                        })
                    }
                />

                <ActionButton
                    label="Tasks"
                    icon={<FileText size={18} color={PRIMARY} />}
                    onPress={() =>
                        router.push({
                            pathname:
                                "/(staff)/channels/[channelId]/tasks" as any,
                            params: { channelId },
                        })
                    }
                />
            </View>
            <View className="mt-3 flex-row">
                <ActionButton
                    label={
                        isGeneratingReport
                            ? "Generating report..."
                            : "Generate Report"
                    }
                    icon={
                        isGeneratingReport ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Share2 size={18} color="#ffffff" />
                        )
                    }
                    variant="primary"
                    disabled={isGeneratingReport}
                    onPress={handleGenerateReport}
                />
            </View>

            <Text className="text-lg text-gray-950 font-kumbhBold mt-5">
                Members
            </Text>
        </View>
    );

    if (isLoading) {
        return (
            <View
                style={{ paddingTop: insets.top }}
                className="flex-1 bg-[#F7F8FB] items-center justify-center"
            >
                <ActivityIndicator />
                <Text className="text-gray-600 mt-3 font-kumbh">
                    Loading channel...
                </Text>
            </View>
        );
    }

    const isIOS = Platform.OS === "ios";
    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F7F8FB]"
        >
            <PlatformAdaptiveHeader title="Channel Info" />

            <FlatList
                data={members}
                keyExtractor={(m) => m.id}
                ListHeaderComponent={header}
                renderItem={({ item }) => {
                    const memberRole = (item.role ?? "").toLowerCase();
                    const isPrivileged = isAdminLikeRole(memberRole);
                    const isSelf = meId === item.id;
                    const canRemoveMember =
                        canManageMembers && !isSelf && !isPrivileged;

                    return (
                        <RowMember
                            item={item}
                            onPress={() => {
                                // e.g., router.push({ pathname: "/(staff)/users/[userId]", params: { userId: item.id }});
                            }}
                            canRemove={canRemoveMember}
                            isRemoving={removingId === item.id}
                            onRemove={() => confirmRemove(item)}
                        />
                    );
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                    <View className="mx-5 mt-2 rounded-3xl bg-white border border-gray-100 px-5 py-12 items-center">
                        <View className="h-12 w-12 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-3">
                            <UsersRound size={22} color={PRIMARY} />
                        </View>
                        <Text className="text-gray-950 font-kumbhBold">
                            No members found.
                        </Text>
                        <Text className="text-gray-500 mt-1 text-center font-kumbh">
                            Added members will appear here.
                        </Text>
                    </View>
                }
            />
            <OptionSheet
                visible={isAddSheetVisible}
                onClose={() => setAddSheetVisible(false)}
                onSelect={handleAddMember}
                title="Add member to channel"
                options={addUserOptions}
            />
            {canManageMembers && (
                <View className="absolute bottom-6 right-6">
                    <Pressable
                        onPress={handleOpenAddMember}
                        disabled={isAddingMember}
                        className="h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg"
                    >
                        {isAddingMember ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Plus size={26} color="#fff" />
                        )}
                    </Pressable>
                </View>
            )}
        </SafeAreaView>
    );
}
