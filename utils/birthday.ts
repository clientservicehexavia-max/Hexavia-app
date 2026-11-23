export function toBirthdayInput(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function birthdayInputFromDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function birthdayPickerDate(value?: string | null) {
    const normalized = toBirthdayInput(value);
    const parsed = normalized ? new Date(`${normalized}T12:00:00`) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function formatBirthdayDate(value?: string | null) {
    if (!value) return "";
    const normalized = toBirthdayInput(value);
    if (!normalized) return "";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    }).format(new Date(`${normalized}T12:00:00`));
}

export function birthdayTodayMessage(names: string[]) {
    if (names.length === 1) return `${names[0]} has a birthday today`;
    if (names.length === 2) return `${names[0]} and ${names[1]} have birthdays today`;
    return `${names[0]} and ${names.length - 1} others have birthdays today`;
}
