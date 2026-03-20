export type WorkingDayCalendarMap = Record<string, number[]>;

const normalizeMonthKey = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${year}-${String(Number(month)).padStart(2, '0')}`;
};

const parseMonthKey = (monthKey: string) => {
    const normalized = normalizeMonthKey(monthKey);
    const [year, month] = normalized.split('-');
    return {
        year: Number(year),
        month: Number(month),
        normalized,
    };
};

const sortUniqueDays = (days: number[], totalDaysInMonth: number) =>
    Array.from(
        new Set(
            days.filter((day) => Number.isInteger(day) && day >= 1 && day <= totalDaysInMonth)
        )
    ).sort((a, b) => a - b);

export const parseWorkingDayCalendar = (rawCalendar?: string | null): WorkingDayCalendarMap => {
    if (!rawCalendar) return {};

    try {
        const parsed = JSON.parse(rawCalendar);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }

        return Object.entries(parsed).reduce<WorkingDayCalendarMap>((acc, [monthKey, days]) => {
            if (!Array.isArray(days)) return acc;
            const { normalized, year, month } = parseMonthKey(monthKey);
            if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
                return acc;
            }
            const totalDaysInMonth = new Date(year, month, 0).getDate();
            acc[normalized] = sortUniqueDays(
                days.map((day) => Number(day)),
                totalDaysInMonth
            );
            return acc;
        }, {});
    } catch {
        return {};
    }
};

export const serializeWorkingDayCalendar = (calendar: WorkingDayCalendarMap) =>
    JSON.stringify(
        Object.keys(calendar)
            .sort()
            .reduce<WorkingDayCalendarMap>((acc, monthKey) => {
                const { normalized, year, month } = parseMonthKey(monthKey);
                if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
                    return acc;
                }
                const totalDaysInMonth = new Date(year, month, 0).getDate();
                acc[normalized] = sortUniqueDays(
                    (calendar[monthKey] || []).map((day) => Number(day)),
                    totalDaysInMonth
                );
                return acc;
            }, {})
    );

export const buildDefaultWorkingDaysForMonth = (monthKey: string) => {
    const { normalized, year, month } = parseMonthKey(monthKey);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return [] as number[];
    }

    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const workingDays: number[] = [];

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays.push(day);
        }
    }

    return sortUniqueDays(workingDays, totalDaysInMonth).map((day) => Number(day)).map((day) => day);
};

export const getWorkingDaysForMonth = (calendar: WorkingDayCalendarMap, monthKey: string) => {
    const normalized = normalizeMonthKey(monthKey);
    if (Object.prototype.hasOwnProperty.call(calendar, normalized)) {
        return calendar[normalized] || [];
    }
    return buildDefaultWorkingDaysForMonth(normalized);
};

export const getWorkingDaysCountForMonth = (calendar: WorkingDayCalendarMap, monthKey: string) =>
    getWorkingDaysForMonth(calendar, monthKey).length;

export const countWorkingDaysUpTo = (calendar: WorkingDayCalendarMap, monthKey: string, cutoffDay: number) =>
    getWorkingDaysForMonth(calendar, monthKey).filter((day) => day <= cutoffDay).length;

export const isWorkingDay = (calendar: WorkingDayCalendarMap, monthKey: string, day: number) =>
    getWorkingDaysForMonth(calendar, monthKey).includes(day);

export const toggleWorkingDay = (calendar: WorkingDayCalendarMap, monthKey: string, day: number) => {
    const normalized = normalizeMonthKey(monthKey);
    const { year, month } = parseMonthKey(normalized);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return calendar;
    }

    const totalDaysInMonth = new Date(year, month, 0).getDate();
    if (!Number.isInteger(day) || day < 1 || day > totalDaysInMonth) {
        return calendar;
    }

    const currentDays = getWorkingDaysForMonth(calendar, normalized);
    const nextDays = currentDays.includes(day)
        ? currentDays.filter((existingDay) => existingDay !== day)
        : [...currentDays, day];

    return {
        ...calendar,
        [normalized]: sortUniqueDays(nextDays, totalDaysInMonth),
    };
};
