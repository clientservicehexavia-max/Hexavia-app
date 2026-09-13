import { api } from "@/api/axios";

export type BirthdayScope = "all" | "clients" | "partners" | "team";

export type BirthdayPerson = {
    _id: string;
    name: string;
    kind: "client" | "partner" | "team";
    dateOfBirth: string;
    occurrence: string;
    daysUntil: number;
};

export type BirthdaySummary = {
    today: BirthdayPerson[];
    thisWeek: BirthdayPerson[];
    thisMonth: BirthdayPerson[];
    upcoming: BirthdayPerson[];
    all: BirthdayPerson[];
    counts: { today: number; week: number; month: number };
};

export async function fetchBirthdaySummary(scope: BirthdayScope = "all") {
    const { data } = await api.get<{ data: BirthdaySummary }>(
        `/admin/birthdays?scope=${scope}`,
    );
    return data.data;
}
