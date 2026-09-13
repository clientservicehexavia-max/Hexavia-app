export type NotificationKind =
  | "project"
  | "finance"
  | "mention"
  | "task"
  | "channel"
  | "mass"
  | "birthday";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string; // ISO
};

export const seedNotifications: AppNotification[] = [
  // Today
  // {
  //   id: "n1",
  //   kind: "project",
  //   title: "Project Update",
  //   message: "Design Sprint moved to review…",
  //   createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
  // },
  // Yesterday
  // {
  //   id: "n2",
  //   kind: "task",
  //   title: "Task Deadline",
  //   message: "Design seminar slides due…",
  //   createdAt: new Date(
  //     Date.now() - 24 * 60 * 60 * 1000 + 60 * 60 * 1000
  //   ).toISOString(), // ~23h ago
  // },
  // {
  //   id: "n3",
  //   kind: "task",
  //   title: "Task Deadline",
  //   message: "Design seminar slides due…",
  //   createdAt: new Date(
  //     Date.now() - 24 * 60 * 60 * 1000 + 8.5 * 60 * 60 * 1000
  //   ).toISOString(),
  // },
  // {
  //   id: "n4",
  //   kind: "mention",
  //   title: "Mention",
  //   message: "@ Mark: I’ve updated the Design",
  //   createdAt: new Date(
  //     Date.now() - 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
  //   ).toISOString(),
  // },
  // Older (Dec 19, 2024 example)
  // {
  //   id: "n5",
  //   kind: "finance",
  //   title: "Payment Received",
  //   message: "Client paid NGN 3,000,000 for…",
  //   createdAt: "2024-12-19T15:15:00.000Z",
  // },
  // {
  //   id: "n6",
  //   kind: "finance",
  //   title: "Expense Approved",
  //   message: "Travel expense for June",
  //   createdAt: "2024-12-19T05:15:00.000Z",
  // },
];
