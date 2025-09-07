"use client";

import React, { useState, useMemo } from "react";
import { JSX } from "react/jsx-runtime";

const pad = (n: string | number): string => String(n).padStart(2, "0");

interface CronFields {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

function fieldsToCron({ minute, hour, dayOfMonth, month, dayOfWeek }: CronFields): string {
  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}

function dowName(dow: string | number): string {
  const map: Record<number, string> = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  if (typeof dow === "number" && map[dow]) return map[dow];
  const lowered = String(dow).toLowerCase();
  if (lowered.startsWith("mon")) return "Monday";
  if (lowered.startsWith("tue")) return "Tuesday";
  if (lowered.startsWith("wed")) return "Wednesday";
  if (lowered.startsWith("thu")) return "Thursday";
  if (lowered.startsWith("fri")) return "Friday";
  if (lowered.startsWith("sat")) return "Saturday";
  if (lowered.startsWith("sun")) return "Sunday";
  return String(dow);
}

function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return "Invalid cron";
  const [m, h, dom, mon, dow] = parts;

  if (m === "*" && h === "*" && dom === "*" && mon === "*" && dow === "*") return "Every minute";
  if (m === "0" && h === "*" && dom === "*" && mon === "*" && dow === "*") return "Hourly at minute 0";
  if (/^\d+$/.test(m) && h === "*" && dom === "*" && mon === "*" && dow === "*") return `Every hour at minute ${m}`;
  if (/^\d+$/.test(m) && /^\d+$/.test(h) && dom === "*" && mon === "*" && dow === "*") return `Every day at ${pad(h)}:${pad(m)}`;
  if (/^\d+$/.test(m) && /^\d+$/.test(h) && dow !== "*" && dom === "*") {
    return `Every ${dowName(dow)} at ${pad(h)}:${pad(m)}`;
  }
  return `Cron: ${cron}`;
}

interface TimeToken {
  hour: number;
  minute: number;
}

function parseTimeToken(token: string): TimeToken | null {
  let tkn = token.trim().toLowerCase();
  const ampm = tkn.endsWith("am") || tkn.endsWith("pm");
  if (ampm) {
    const isPM = tkn.endsWith("pm");
    tkn = tkn.replace(/am|pm/, "");
    const [hh, mm] = tkn.split(":");
    let hour = parseInt(hh || "0", 10);
    const minute = mm ? parseInt(mm, 10) : 0;
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    return { hour, minute };
  }
  if (tkn.includes(":")) {
    const [hh, mm] = tkn.split(":");
    return { hour: parseInt(hh, 10), minute: parseInt(mm, 10) };
  }
  const num = parseInt(tkn, 10);
  if (!isNaN(num)) return { hour: num, minute: 0 };
  return null;
}

function parseNaturalLanguageToCron(nl: string): string | null {
  if (!nl || !nl.trim()) return null;
  const text = nl.toLowerCase().trim();

  if (text === "every minute") return "* * * * *";
  if (text === "every hour") return "0 * * * *";

  const dayAtMatch = text.match(/every (day|weekday|weekend|\w+) at ([\d:apm ]+)/i);
  if (dayAtMatch) {
    const when = dayAtMatch[1];
    const timeToken = dayAtMatch[2].trim();
    const t = parseTimeToken(timeToken);
    if (!t) return null;
    const minute = String(t.minute);
    const hour = String(t.hour);
    if (when === "day") return `${minute} ${hour} * * *`;
    if (when === "weekday") return `${minute} ${hour} * * 1-5`;
    if (when === "weekend") return `${minute} ${hour} * * 6,0`;
    const dowMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    if (dowMap[when]) return `${minute} ${hour} * * ${dowMap[when]}`;
  }

  const dayNameMatch = text.match(/every (sunday|monday|tuesday|wednesday|thursday|friday|saturday) at ([\d:apm ]+)/i);
  if (dayNameMatch) {
    const day = dayNameMatch[1].toLowerCase();
    const t = parseTimeToken(dayNameMatch[2]);
    if (!t) return null;
    const dowMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    return `${t.minute} ${t.hour} * * ${dowMap[day]}`;
  }

  const monthMatch = text.match(/every month on (\d{1,2}) at ([\d:apm ]+)/i);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    const t = parseTimeToken(monthMatch[2]);
    if (!t) return null;
    return `${t.minute} ${t.hour} ${day} * *`;
  }

  const atOnMatch = text.match(/at ([\d:apm ]+) on (weekdays|weekends|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (atOnMatch) {
    const t = parseTimeToken(atOnMatch[1]);
    const on = atOnMatch[2].toLowerCase();
    if (!t) return null;
    if (on === "weekdays") return `${t.minute} ${t.hour} * * 1-5`;
    if (on === "weekends") return `${t.minute} ${t.hour} * * 6,0`;
    const dowMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    if (dowMap[on] !== undefined) return `${t.minute} ${t.hour} * * ${dowMap[on]}`;
  }

  return null;
}

export default function CronBuilder(): JSX.Element {
  const [minute, setMinute] = useState("0");
  const [hour, setHour] = useState("0");
  const [dayOfMonth, setDayOfMonth] = useState("*");
  const [month, setMonth] = useState("*");
  const [dayOfWeek, setDayOfWeek] = useState("*");
  const [natural, setNatural] = useState("");
  const [message, setMessage] = useState("");

  const cron = useMemo(
    () => fieldsToCron({ minute, hour, dayOfMonth, month, dayOfWeek }),
    [minute, hour, dayOfMonth, month, dayOfWeek]
  );

  const human = useMemo(() => cronToHuman(cron), [cron]);

  function applyNatural() {
    const parsed = parseNaturalLanguageToCron(natural);
    if (!parsed) {
      setMessage("Could not parse the natural language. Try examples like 'every Monday at 9am' or 'every day at 14:30'.");
      return;
    }
    setMessage("Parsed successfully — applied to fields.");
    const parts = parsed.split(/\s+/);
    setMinute(parts[0]);
    setHour(parts[1]);
    setDayOfMonth(parts[2]);
    setMonth(parts[3]);
    setDayOfWeek(parts[4]);
  }

  function copyCron() {
    navigator.clipboard.writeText(cron).then(() => {
      setMessage("Cron copied to clipboard!");
      setTimeout(() => setMessage(""), 2000);
    }).catch(() => setMessage("Copy failed — please copy manually."));
  }

  function presetEveryDay() {
    setMinute("0");
    setHour("9");
    setDayOfMonth("*");
    setMonth("*");
    setDayOfWeek("*");
  }

  function presetEveryMonday() {
    setMinute("0");
    setHour("9");
    setDayOfMonth("*");
    setMonth("*");
    setDayOfWeek("1");
  }

  function presetEveryMinute() {
    setMinute("*");
    setHour("*");
    setDayOfMonth("*");
    setMonth("*");
    setDayOfWeek("*");
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-4">Cron Job Expression Generator</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Natural language (try: "every Monday at 9am")
        </label>
        <div className="flex gap-2 mt-2">
          <input
            value={natural}
            onChange={(e) => setNatural(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="e.g. every day at 14:30"
          />
          <button onClick={applyNatural} className="px-4 py-2 rounded bg-indigo-600 text-white">
            Apply
          </button>
        </div>
        {message && <p className="text-sm text-bla-600 mt-2">{message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-black-700">Minute</label>
          <input
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-2"
            placeholder="0 or * or */5"
          />
          <p className="text-xs text-black-500 mt-1">Examples: 0, 30, *, */15</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Hour</label>
          <input
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-2"
            placeholder="0-23 or *"
          />
          <p className="text-xs text-black-500 mt-1">Examples: 0, 9, 14, *</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Day of month</label>
          <input
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-2"
            placeholder="1-31 or *"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Month</label>
          <input
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-2"
            placeholder="1-12 or *"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Day of week</label>
          <input
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-2"
            placeholder="0-6 (0=Sun) or *"
          />
          <p className="text-xs text-gray-500 mt-1">Examples: 1 (Monday), 1-5 (Mon-Fri), 0 (Sun), *</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={presetEveryDay} className="px-3 py-2 rounded border">Every day 9:00</button>
        <button onClick={presetEveryMonday} className="px-3 py-2 rounded border">Every Monday 9:00</button>
        <button onClick={presetEveryMinute} className="px-3 py-2 rounded border">Every minute</button>
      </div>

      <div className="bg-gray-50 p-4 rounded mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-black-500">Cron expression</div>
            <div className="font-mono text-lg">{cron}</div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={copyCron} className="px-3 py-2 rounded bg-green-600 text-white">Copy</button>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-700">{human}</div>
      </div>

      <div className="text-sm text-black-600">
        <strong>Quick help:</strong>
        <ul className="list-disc ml-5 mt-2">
          <li>Fields: <code>minute hour day-of-month month day-of-week</code></li>
          <li>Use <code>*</code> for "any" and ranges like <code>1-5</code>.</li>
          <li>Examples: <code>0 9 * * *</code> = every day at 9:00.</li>
        </ul>
      </div>
    </div>
  );
}
