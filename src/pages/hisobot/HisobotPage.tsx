import { useMemo, useState } from "react";
import { CalendarX2, Plus, Trash2, X } from "lucide-react";
import { useDb } from "@/data/db";
import { useT } from "@/i18n";
import { DrillSheet, type Drill } from "@/kit/blocks";
import { EMPTY, FilterBar, MultiSelect, usePageFilters } from "@/kit/filters";
import { cx } from "@/lib/cx";
import {
  fmtCompact,
  fmtMoney,
  fmtMonth,
  fmtNum,
  fmtPct,
  fmtShortDate,
} from "@/lib/format";
import { useDataSource } from "@/data/source";
import { useProjectState } from "@/lib/projectState";
import { Button, Card, EmptyState } from "@/ui/controls";
import { useToast } from "@/ui/overlay";
import {
  JAMI,
  META_METRICS,
  METRICS,
  QUALIFIED_METRICS,
  VISIT_METRICS,
  REC_KIND,
  TARGET,
  metricValue,
  monthCtx,
  sectionData,
  type BaseKey,
  type CustomSection,
  type Fmt,
  type MetricDef,
  type MetricKey,
  type SectionData,
  type SectionDef,
} from "./compute";
import { buildDrill } from "./drill";
import { MONTHS, MonthPicker, SectionModal, shiftMonth, type YM } from "./parts";

const NO_SECTIONS: CustomSection[] = [];
const NO_PLANS: Record<string, number> = {};
const isList = (v: unknown): v is CustomSection[] => Array.isArray(v);
const isPlans = (v: unknown): v is Record<string, number> =>
  !!v && typeof v === "object" && !Array.isArray(v);
/** Oylik reja is per section × month and does not follow the Kampaniya / Mas'ul filters (inventory filter note). */
const NOF = { campaign: EMPTY, manager: EMPTY };

/** Kunlik hisobot — mountain's month × day "Targeted Ads Metrics" grid (docs/default-dashboard/hisobot.json). */
export default function HisobotPage() {
  const { t, lang } = useT();
  const toast = useToast();
  const db = useDb();
  const { meta } = useDataSource();
  const f = usePageFilters(["campaign", "manager"] as const, "month");
  const now = f.now;
  const today: YM = {
    y: new Date(now).getFullYear(),
    m: new Date(now).getMonth(),
  };
  const [ym, setYm] = useState<YM>(today);
  // sections and plans persist per data source (localStorage in the demo, the server in a live project)
  const [custom, setCustom] = useProjectState("hisobotSections", NO_SECTIONS, isList);
  const [plans, setPlans] = useProjectState("hisobotPlans", NO_PLANS, isPlans);
  const hasMeta = meta.sources.meta;
  const [active, setActive] = useState<string>("jami");
  const [hidden, setHidden] = useState<Set<MetricKey>>(new Set());
  const [modal, setModal] = useState(false);
  const [drill, setDrill] = useState<Drill<unknown> | null>(null);

  const sections: SectionDef[] = useMemo(
    () => [
      JAMI,
      ...(hasMeta ? [TARGET] : []),
      ...custom.map((c): SectionDef => ({
        key: c.id,
        label: c.title,
        color: c.color,
        kind: "source",
        source: c.source,
        custom: true,
      })),
    ],
    [custom, hasMeta],
  );
  const activeKey =
    active === "all" || sections.some((s) => s.key === active)
      ? active
      : "jami";
  const shown =
    activeKey === "all"
      ? sections
      : sections.filter((s) => s.key === activeKey);

  const filters = useMemo(
    () => ({ campaign: f.multi.campaign, manager: f.multi.manager }),
    [f.multi.campaign, f.multi.manager],
  );
  const filtered =
    f.multi.campaign.values.length > 0 || f.multi.manager.values.length > 0;
  const ctx = useMemo(
    () => monthCtx(db, ym.y, ym.m, now, meta),
    [db, ym.y, ym.m, now, meta],
  );
  const prevCtx = useMemo(() => {
    const p = shiftMonth(ym, -1);
    return monthCtx(db, p.y, p.m, now, meta);
  }, [db, ym, now, meta]);
  const data = useMemo(
    () => new Map(sections.map((s) => [s.key, sectionData(ctx, s, filters)])),
    [ctx, sections, filters],
  );
  const prevData = useMemo(
    () => new Map(sections.map((s) => [s.key, sectionData(prevCtx, s, NOF)])),
    [prevCtx, sections],
  );
  // First moment the demo data covers (CRM or ads). A derived plan needs the whole previous month inside it.
  const dataStart = useMemo(() => {
    let min = Infinity;
    for (const l of db.leads) if (l.ts < min) min = l.ts;
    for (const a of db.ads) {
      const ts = new Date(`${a.day}T00:00:00`).getTime();
      if (ts < min) min = ts;
    }
    return min;
  }, [db]);
  const prevCovered = prevCtx.from >= dataStart;
  const noData =
    ctx.leads.length === 0 && ctx.ads.length === 0 && ctx.payments.length === 0;

  const isCurrent = ym.y === today.y && ym.m === today.m;
  const todayIdx = isCurrent ? new Date(now).getDate() - 1 : -1;
  const days = ctx.days;
  const lastIdx = isCurrent ? todayIdx : ctx.to > ctx.from ? days - 1 : -1;
  const monthKeyStr = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}`;
  const monthLabel = fmtMonth(new Date(ym.y, ym.m, 1), lang);

  const campaigns = useMemo(() => db.campaigns.map((c) => c.name), [db]);
  const managers = useMemo(
    () => db.staff.filter((s) => s.sales).map((s) => s.name),
    [db],
  );

  const fmt = (k: Fmt, n: number, day = false) => {
    switch (k) {
      case "usd":
        return `$${fmtNum(n, n > 0 && n < 10 ? 1 : 0, lang)}`;
      case "num":
        return fmtNum(n, 0, lang);
      case "pct":
        return fmtPct(n, 1, lang);
      case "som":
        return day ? fmtCompact(n, lang) : fmtMoney(n, lang, true);
    }
  };

  // Oylik reja: the saved value, else previous month's Fakt × 1.1 (deterministic). Computed rows have no plan.
  const planKey = (sec: string, m: MetricKey) => `${sec}|${m}|${monthKeyStr}`;
  const planOf = (sec: SectionDef, m: MetricDef): number | null => {
    if (m.computed) return null;
    const saved = plans[planKey(sec.key, m.key)];
    if (saved !== undefined) return saved;
    if (!prevCovered) return null;
    const prev = prevData.get(sec.key)?.tot[m.key as BaseKey] ?? 0;
    const x = prev * 1.1;
    return m.fmt === "som" ? Math.round(x / 1000) * 1000 : Math.round(x);
  };
  const savePlan = (sec: string, m: MetricKey, v: number) => {
    const next = { ...plans, [planKey(sec, m)]: v };
    setPlans(next);
    toast(t("Saqlandi"));
  };

  const saveSections = (next: CustomSection[]) => {
    setCustom(next);
  };
  const removeSection = (id: string) => {
    saveSections(custom.filter((c) => c.id !== id));
    // drop the section's saved plans so a later section never inherits them
    const next = Object.fromEntries(
      Object.entries(plans).filter(([k]) => !k.startsWith(`${id}|`)),
    );
    setPlans(next);
    setActive(hasMeta ? "target" : "jami");
  };

  const openDrill = (
    sec: SectionDef,
    d: SectionData,
    m: MetricDef,
    i: number | null,
  ) => {
    if (m.computed) return;
    const k = m.key as BaseKey;
    const rows =
      i === null ? d.recs[k].slice(0, lastIdx + 1).flat() : d.recs[k][i]!;
    const sub =
      i === null ? monthLabel : fmtShortDate(new Date(ym.y, ym.m, i + 1), lang);
    setDrill(
      buildDrill(
        REC_KIND[k],
        rows,
        `${t(m.label)} · ${t(sec.label)}`,
        sub,
        t,
        lang,
        meta.leadStageLabels,
        k === "sales",
      ),
    );
  };

  // no visits in this business: no meeting rows; "Sifatli lid" not chosen yet: no qualified rows (never a misleading 0)
  const metrics = METRICS.filter(
    (m) =>
      !hidden.has(m.key) &&
      (hasMeta || !META_METRICS.has(m.key)) &&
      (meta.visits !== false || !VISIT_METRICS.has(m.key)) &&
      (meta.qualifiedSet !== false || !QUALIFIED_METRICS.has(m.key)),
  );
  const dayNums = Array.from({ length: days }, (_, i) => i);
  const solid = "bg-[rgb(var(--card-rgb))]";
  const todayHead =
    "bg-[color-mix(in_srgb,rgb(var(--accent-rgb))_16%,rgb(var(--card-rgb)))] text-primary-strong";

  return (
    <div className="page-in">
      <FilterBar
        preset={f.preset}
        onPreset={f.setPreset}
        active={f.active}
        onClear={() => {
          f.clear();
          setYm(today);
        }}
        period={{
          label: "Oy",
          node: <MonthPicker ym={ym} onYm={setYm} today={today} />,
          summary: `${t(MONTHS[ym.m]!)} ${ym.y}`,
        }}
      >
        <MultiSelect
          label="Kampaniya"
          options={campaigns}
          value={f.multi.campaign}
          onChange={(m) => f.set("campaign", m)}
        />
        <MultiSelect
          label="Mas'ul"
          options={managers}
          value={f.multi.manager}
          onChange={(m) => f.set("manager", m)}
        />
      </FilterBar>

      {/* Section toggle: Jami / Target / custom … / + Qo'shish — one section visible at a time, as in mountain */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {sections.map((s) => {
          const on = activeKey === s.key;
          return (
            <div key={s.key} className="group/pill relative">
              <button
                type="button"
                onClick={() => setActive(s.key)}
                aria-pressed={on}
                className={cx(
                  "pressable inline-flex min-h-[34px] items-center gap-2 rounded-[12px] border px-3.5 text-[0.8125rem] font-semibold",
                  s.custom && "pe-8",
                  on
                    ? "border-transparent text-ink"
                    : "border-line bg-surface text-ink-2 hover:text-ink",
                )}
                style={
                  on
                    ? {
                        background: `color-mix(in srgb, var(--chart-${s.color}) 20%, transparent)`,
                        boxShadow: `inset 0 0 0 1.5px var(--chart-${s.color})`,
                      }
                    : undefined
                }
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: `var(--chart-${s.color})` }}
                />
                {t(s.label)}
              </button>
              {s.custom && (
                <button
                  type="button"
                  title={t("O'chirish")}
                  aria-label={`${t("O'chirish")}: ${s.label}`}
                  onClick={() => removeSection(s.key)}
                  className="absolute end-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink sm:opacity-0 sm:group-hover/pill:opacity-100 sm:focus-visible:opacity-100"
                >
                  <X size={13} strokeWidth={2.4} />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setModal(true)}
          className="pressable inline-flex min-h-[34px] items-center gap-1.5 rounded-[12px] border border-dashed border-[var(--border-strong)] px-3.5 text-[0.8125rem] font-semibold text-ink-3 hover:text-ink"
        >
          <Plus size={14} strokeWidth={2.4} />
          {t("Qo'shish")}
        </button>
      </div>

      <Card
        flush
        dense
        title={t("Targeted Ads Metrics")} uz={"Targeted Ads Metrics"}
        actions={
          hidden.size > 0 ? (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => setHidden(new Set())}
            >
              {t("Metrikalarni tiklash ({n})", { n: hidden.size })}
            </Button>
          ) : undefined
        }
      >
        {noData ? (
          <div className="border-t border-line">
            <EmptyState
              icon={CalendarX2}
              title={t("Bu oy uchun ma'lumot yo'q")}
              text={t("Tanlangan oyda CRM va reklama ma'lumotlari topilmadi.")}
            />
          </div>
        ) : (
          <div className="scroll-thin overflow-x-auto overflow-y-auto border-t border-line sm:max-h-[max(420px,calc(100dvh-260px))]">
            <table className="data-table text-[0.8125rem]">
              <thead>
                <tr>
                  <th
                    className={cx(
                      "sticky start-0 z-[3] w-[138px] max-w-[138px] min-w-[138px] border-e border-line !ps-4 sm:w-auto sm:max-w-none sm:min-w-[196px]",
                      solid,
                    )}
                  >
                    {t("Metric Name")}
                  </th>
                  <th className={cx("min-w-[112px] !px-2.5 text-end", solid)}>
                    {t("Oylik reja")}
                  </th>
                  <th
                    className={cx(
                      "min-w-[96px] border-s border-line !px-2.5 text-end !text-good",
                      solid,
                    )}
                  >
                    {t("Fakt")}
                  </th>
                  <th
                    className={cx(
                      "min-w-[74px] border-s border-line !px-2 text-center",
                      solid,
                    )}
                  >
                    {t("Var %")}
                  </th>
                  {dayNums.map((i) => (
                    <th
                      key={i}
                      className={cx(
                        "num min-w-[44px] border-s border-line !px-1 text-center",
                        i === todayIdx ? todayHead : solid,
                      )}
                    >
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((sec) => {
                  const d = data.get(sec.key)!;
                  return [
                    <tr key={`${sec.key}-band`}>
                      <td colSpan={days + 4} className="!border-b-0 !p-0">
                        <div
                          className="flex items-center py-2"
                          style={{
                            background: `color-mix(in srgb, var(--chart-${sec.color}) 17%, rgb(var(--card-rgb)))`,
                            boxShadow: `inset 4px 0 0 var(--chart-${sec.color})`,
                          }}
                        >
                          <div className="sticky start-0 flex items-center gap-2 ps-4">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                background: `var(--chart-${sec.color})`,
                              }}
                            />
                            <span className="text-[0.6875rem] font-bold tracking-[0.12em] text-ink uppercase">
                              {t(sec.label)}
                            </span>
                            {sec.custom && (
                              <button
                                type="button"
                                title={t("Bo'limni o'chirish")}
                                aria-label={t("Bo'limni o'chirish")}
                                onClick={() => removeSection(sec.key)}
                                className="ms-1 grid h-6 w-6 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>,
                    ...metrics.map((m) => {
                      const fakt = metricValue(d, m.key, null);
                      const plan = planOf(sec, m);
                      // the plan ignores the Mas'ul / Kampaniya filters: a filtered Fakt against it would mislead, so no Var % then
                      const pct =
                        plan && !filtered
                          ? Math.round((fakt / plan) * 100)
                          : null;
                      return (
                        <tr key={`${sec.key}-${m.key}`} className="group">
                          <td
                            className={cx(
                              "sticky start-0 z-[1] max-w-[138px] border-e border-line !py-1.5 !ps-4 !pe-1.5 font-medium sm:max-w-none",
                              solid,
                            )}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={cx(
                                  "leading-tight whitespace-normal sm:whitespace-nowrap",
                                  m.computed && "text-ink-2",
                                )}
                              >
                                {t(m.label)}
                              </span>
                              <button
                                type="button"
                                title={t("Yashirish")}
                                aria-label={`${t("Yashirish")}: ${t(m.label)}`}
                                onClick={() =>
                                  setHidden((h) => new Set(h).add(m.key))
                                }
                                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-ink-3 opacity-100 hover:bg-surface-2 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                              >
                                <X size={12} strokeWidth={2.4} />
                              </button>
                            </div>
                          </td>
                          <td className="!px-2.5 !py-1.5 text-end">
                            <PlanCell
                              value={plan}
                              computed={!!m.computed}
                              format={(n) => fmt(m.fmt, n)}
                              onSave={(v) => savePlan(sec.key, m.key, v)}
                            />
                          </td>
                          <td className="num border-s border-line !px-2.5 !py-1.5 text-end font-bold">
                            {fakt > 0 ? (
                              m.computed ? (
                                fmt(m.fmt, fakt)
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openDrill(sec, d, m, null)}
                                  className="rounded-[6px] px-1 hover:bg-primary-soft hover:text-primary-strong"
                                >
                                  {fmt(m.fmt, fakt)}
                                </button>
                              )
                            ) : (
                              <span className="text-ink-3">—</span>
                            )}
                          </td>
                          <td className="border-s border-line !px-2 !py-1.5 text-center">
                            <VarChip pct={pct} />
                          </td>
                          {dayNums.map((i) => {
                            const future = i > lastIdx;
                            const v = future ? 0 : metricValue(d, m.key, i);
                            return (
                              <td
                                key={i}
                                className={cx(
                                  "num border-s border-line !px-1 !py-1.5 text-center text-[0.75rem]",
                                  i === todayIdx &&
                                    "bg-[rgb(var(--accent-rgb)/0.07)]",
                                )}
                              >
                                {future ? null : v > 0 ? (
                                  m.computed ? (
                                    <span className="text-ink-2">
                                      {fmt(m.fmt, v, true)}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openDrill(sec, d, m, i)}
                                      className="rounded-[6px] px-1 hover:bg-primary-soft hover:text-primary-strong"
                                    >
                                      {fmt(m.fmt, v, true)}
                                    </button>
                                  )
                                ) : (
                                  <span className="text-ink-3">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SectionModal
        open={modal}
        onOpenChange={setModal}
        onCreate={(s) => {
          const id = `c${Date.now().toString(36)}`;
          saveSections([...custom, { id, ...s }]);
          setActive(id);
        }}
      />
      <DrillSheet drill={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

/** Var % chip: ≥ 90 good (mint), 50–89 warm, < 50 neutral grey — never alarming red. */
function VarChip({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-ink-3">—</span>;
  return (
    <span
      className={cx(
        "num inline-block min-w-[46px] rounded-full px-2 py-0.5 text-[0.75rem] font-bold",
        pct >= 90
          ? "bg-mint text-mint-ink"
          : pct >= 50
            ? "bg-warm-soft text-warm"
            : "bg-surface-2 text-ink-2",
      )}
    >
      {pct}%
    </span>
  );
}

/** Oylik reja cell: click → input + Saqlash; Enter / blur saves, Esc cancels; computed rows show "—". */
function PlanCell({
  value,
  computed,
  format,
  onSave,
}: {
  value: number | null;
  computed: boolean;
  format: (n: number) => string;
  onSave: (v: number) => void;
}) {
  const { t } = useT();
  const [edit, setEdit] = useState<string | null>(null);
  if (computed) return <span className="text-ink-3">—</span>;
  const commit = () => {
    if (edit === null) return;
    const n = Number(edit.replace(/[\s $]/g, "").replace(",", "."));
    setEdit(null);
    if (edit.trim() !== "" && Number.isFinite(n) && n >= 0 && n !== value)
      onSave(n);
  };
  if (edit !== null)
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          inputMode="decimal"
          aria-label={t("Oylik reja")}
          value={edit}
          onChange={(e) => setEdit(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEdit(null);
          }}
          className="num w-[88px] rounded-[8px] border border-[var(--primary)] bg-primary-soft px-1.5 py-0.5 text-end text-[0.8125rem] text-ink outline-none"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          className="rounded-[6px] bg-primary-fill px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white"
        >
          {t("Saqlash")}
        </button>
      </span>
    );
  return (
    <button
      type="button"
      onClick={() => setEdit(value ? String(value) : "")}
      className="num rounded-[6px] px-1 font-bold hover:bg-primary-soft hover:text-primary-strong"
    >
      {value ? (
        format(value)
      ) : (
        <span className="text-[0.75rem] font-normal text-ink-3">
          {t("Kiriting…")}
        </span>
      )}
    </button>
  );
}
