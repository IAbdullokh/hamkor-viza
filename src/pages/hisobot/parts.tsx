import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMeta } from "@/data/source";
import { useT } from "@/i18n";
import { cx } from "@/lib/cx";
import { Button, SelectField, TextField } from "@/ui/controls";
import { Modal } from "@/ui/overlay";
import type { CustomSection } from "./compute";

export const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

export interface YM {
  y: number;
  m: number;
}

export const shiftMonth = (ym: YM, by: number): YM => {
  const d = new Date(ym.y, ym.m + by, 1);
  return { y: d.getFullYear(), m: d.getMonth() };
};

/**
 * The month this grid shows, as one control in the page's filter section (owner, 2026-10-26: no more folding
 * "Filtr: Oktabr 2026" bar with chips + Oy + Yil selects): a chip "Oktabr 2026 ▾" that opens a year with its 12 months
 * (months after this one are off) and "Bu oy" / "O'tgan oy" at the top.
 */
export function MonthPicker({ ym, onYm, today }: { ym: YM; onYm: (v: YM) => void; today: YM }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(ym.y);
  const choose = (v: YM) => {
    onYm(v);
    setOpen(false);
  };
  const quick = [
    { label: "Bu oy", v: today },
    { label: "O'tgan oy", v: shiftMonth(today, -1) },
  ];
  const nav = (dir: -1 | 1) => (
    <button
      type="button"
      aria-label={t(dir < 0 ? "Oldingi yil" : "Keyingi yil")}
      disabled={dir > 0 && year >= today.y}
      onClick={() => setYear((y) => y + dir)}
      className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-35"
    >
      {dir < 0 ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
    </button>
  );
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setYear(ym.y);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className="field pressable inline-flex min-h-[34px] cursor-pointer items-center gap-2 rounded-full ps-3 pe-2.5 text-[0.8125rem] font-medium text-ink"
        >
          <CalendarDays aria-hidden size={15} className="text-ink-3" />
          {t(MONTHS[ym.m]!)} {ym.y}
          <ChevronDown aria-hidden size={15} className={cx("text-ink-3 transition-transform", open && "rotate-180")} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          aria-label={t("Oy")}
          className="pop-in glass-pop z-[65] w-[300px] max-w-[calc(100vw-24px)] rounded-[22px] p-3 focus:outline-none"
        >
          <div className="mb-2 flex gap-1.5">
            {quick.map((q) => {
              const on = q.v.y === ym.y && q.v.m === ym.m;
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => choose(q.v)}
                  className={cx(
                    "pressable rounded-full px-3 py-1 text-[0.8125rem] font-semibold",
                    on ? "bg-primary-soft text-primary-strong" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  {t(q.label)}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1">
            {nav(-1)}
            <span className="flex-1 text-center text-[0.9375rem] font-bold text-ink">{year}</span>
            {nav(1)}
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {MONTHS.map((name, m) => {
              const future = year > today.y || (year === today.y && m > today.m);
              const cur = year === ym.y && m === ym.m;
              return (
                <button
                  key={name}
                  type="button"
                  disabled={future}
                  aria-pressed={cur}
                  onClick={() => choose({ y: year, m })}
                  className={cx(
                    "pressable min-h-[40px] rounded-[12px] text-[0.875rem] disabled:opacity-35",
                    cur ? "bg-primary-fill font-semibold text-white" : "text-ink hover:bg-surface-2",
                  )}
                >
                  {t(name)}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Swatches = chart tokens closest to mountain's #6366f1 #0891b2 #059669 #d97706 #dc2626 #7c3aed #be185d. */
export const SWATCHES = [3, 6, 2, 5, 4, 1, 7];

/** "Yangi bo'lim" modal: Manba, Bo'lim nomi, Rang. */
export function SectionModal({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (s: Omit<CustomSection, "id">) => void;
}) {
  const { t } = useT();
  const { leadSources } = useMeta();
  const [source, setSource] = useState<string>("");
  const [title, setTitle] = useState("");
  const [edited, setEdited] = useState(false);
  const [color, setColor] = useState(SWATCHES[0]!);
  const reset = () => {
    setSource("");
    setTitle("");
    setEdited(false);
    setColor(SWATCHES[0]!);
  };
  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };
  const ok = !!source && !!title.trim();
  return (
    <Modal
      open={open}
      onOpenChange={close}
      width={400}
      title={t("Yangi bo'lim")}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => close(false)}>
            {t("Bekor qilish")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!ok}
            onClick={() => {
              if (!source) return;
              onCreate({ title: title.trim(), source, color });
              close(false);
            }}
          >
            {t("Qo'shish")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <SelectField
          label={t("Manba")}
          value={source}
          onChange={(e) => {
            const s = e.target.value;
            setSource(s);
            if (!edited) setTitle(s ? t(s) : "");
          }}
        >
          <option value="">{t("— Tanlang —")}</option>
          {leadSources.map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t("Bo'lim nomi")}
          value={title}
          placeholder={t("Masalan: Ko'chadan")}
          onChange={(e) => {
            setTitle(e.target.value);
            setEdited(true);
          }}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-semibold text-ink-2">
            {t("Rang")}
          </span>
          <div
            className="flex flex-wrap gap-2.5"
            role="radiogroup"
            aria-label={t("Rang")}
          >
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`${t("Rang")} ${c}`}
                onClick={() => setColor(c)}
                className={cx(
                  "pressable h-8 w-8 rounded-full transition-transform",
                  color === c &&
                    "scale-110 ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[rgb(var(--card-rgb))]",
                )}
                style={{ background: `var(--chart-${c})` }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
