import { createContext, use, useContext, type ReactNode } from "react";
import type {
  DatasetSnapshot,
  PageId,
  SnapshotMeta,
} from "@/features/projects/types";
import { getLiveDataset, getLiveState } from "@/features/projects/api";
import { seedProjectState } from "@/lib/projectState";
import { SOURCES, VOCAB } from "./domain";
import { chartableFields, setCustomFields } from "./customFields";
import { getDb, type Db } from "./db";
import { USD_UZS } from "./generate";
import { hash } from "./random";
import { DAY, startOfDay } from "./range";
import { WORKSPACE_ID } from "./workspaces";
import type {
  AdDay,
  Call,
  Campaign,
  Conversation,
  Deal,
  Lead,
  Order,
  OrderLine,
  Payment,
  Plan,
  Product,
  Staff,
} from "./types";

/**
 * Pluggable data source of the 7 dashboard pages (frontend.md §2.5).
 * The demo (/d/glass/*) reads the seeded generator; a live project (/l/$slug/*) reads its built snapshot from
 * GET /api/live/{slug}/dataset. Pages never know which: they call useDb() for rows and useMeta() for vocabulary.
 */
export type SourceSpec =
  | { kind: "demo" }
  | { kind: "project"; slug: string; projectId: string; version: string };

export interface DataSourceValue {
  spec: SourceSpec;
  db: Db;
  meta: SnapshotMeta;
}

const DEMO_WS = WORKSPACE_ID;
const ALL_PAGES: PageId[] = [
  "lead",
  "deal",
  "calls",
  "kampaniyalar",
  "hisobot",
  "reja",
  "taqsimot",
];

/** Deal pipeline of the demo generator, in column order. Kelishuv = the deal reached an agreement. */
export const DEMO_DEAL_STAGES: SnapshotMeta["dealStages"] = [
  { label: "Yangi / Uchrashuv", status: "open", kelishuv: false },
  { label: "Kelishuv bo'ldi", status: "open", kelishuv: true },
  { label: "Ish boshlandi", status: "open", kelishuv: true },
  { label: "Sotuv bo'ldi", status: "won", kelishuv: true },
  { label: "Bekor bo'ldi", status: "lost", kelishuv: false },
];

/** Default end of the business day in Taqsimot (18:00 → 18:00). */
export const DEFAULT_WORK_END_HOUR = 18;

/** Vocabulary + capabilities of the demo — exactly the constants the pages used before the source became pluggable. */
export function demoMeta(db: Pick<Db, "start"> = getDb(DEMO_WS)): SnapshotMeta {
  return {
    name: "Demo kompaniya",
    portal: "demo.bitrix24.uz",
    timezone: "Asia/Tashkent",
    currency: "UZS",
    usdUzs: USD_UZS,
    dataStart: db.start,
    synthetic: true,
    sources: { crm: true, telephony: "bitrix", meta: true },
    pages: [...ALL_PAGES],
    leadStageLabels: { ...VOCAB.sales.stages },
    leadSources: [...SOURCES],
    callSources: ["Qo'ng'iroq"],
    paidSources: ["Instagram", "Facebook"],
    dealStages: DEMO_DEAL_STAGES.map((s) => ({ ...s })),
    workEndHour: DEFAULT_WORK_END_HOUR,
  };
}

/** Read through useDb() / useDataSource(); exported for data/db.ts only. */
export const DataSourceContext = createContext<DataSourceValue | null>(null);
const Ctx = DataSourceContext;

let demoValue: DataSourceValue | null = null;
function demoSource(): DataSourceValue {
  if (!demoValue) {
    const db = getDb(DEMO_WS);
    demoValue = { spec: { kind: "demo" }, db, meta: demoMeta(db) };
  }
  return demoValue;
}

// ───────────────────────────── snapshot loading ─────────────────────────────

/**
 * One promise per slug + build version (React `use()` needs a stable promise); the saved page state loads with it so
 * Reja / Taqsimot / Hisobot open with the user's values. The browser revalidates the dataset by its ETag (gzip).
 */
const snapshots = new Map<string, Promise<DataSourceValue>>();

export function loadSnapshot(
  spec: Extract<SourceSpec, { kind: "project" }>,
): Promise<DataSourceValue> {
  const key = `${spec.slug}|${spec.version}`;
  let p = snapshots.get(key);
  if (!p) {
    p = Promise.all([getLiveDataset(spec.slug), getLiveState(spec.slug)]).then(
      ([snap, state]) => {
        seedProjectState(spec.slug, state ?? {});
        return { spec, ...hydrate(snap) };
      },
    );
    // React's `use()` reads a settled promise's status synchronously: a snapshot loaded ahead (LivePage applies a new
    // version only once it is here) then swaps in place, with no Suspense fallback and nothing remounted
    const tracked = p as Promise<DataSourceValue> & { status?: string; value?: DataSourceValue; reason?: unknown };
    tracked.status = "pending";
    p.then(
      (v) => {
        tracked.status = "fulfilled";
        tracked.value = v;
      },
      (e: unknown) => {
        tracked.status = "rejected";
        tracked.reason = e;
        // a failed load must be retryable: drop the rejected promise so the next render fetches again
        snapshots.delete(key);
      },
    );
    snapshots.set(key, p);
  }
  return p;
}

/**
 * Forget cached snapshots of a slug (after a refresh job rebuilt it, or before "Qayta urinish"); `keep` = a version still
 * on screen, which stays (dropping it would re-fetch it and flash the loading state).
 */
export function invalidateSnapshot(slug: string, keep?: string): void {
  for (const k of [...snapshots.keys()])
    if (k.startsWith(`${slug}|`) && k !== `${slug}|${keep}`) snapshots.delete(k);
}

// ───────────────────────────── hydrate ─────────────────────────────

type Wire<T> = T extends number ? number | string : T;
const toMs = (v: Wire<number> | null | undefined): number =>
  typeof v === "number" ? v : v ? Date.parse(v) : 0;
const toMsOrNull = (v: Wire<number> | null | undefined): number | null =>
  v == null ? null : toMs(v);
const byTs = <T extends { ts: number }>(rows: T[]): T[] =>
  rows.sort((a, b) => a.ts - b.ts);
/** a date before this is a missing one (the server reads it as 1970), not history */
export const REAL_DATES_FROM = Date.UTC(2000, 0, 1);
/** epoch ms → its yyyy-MM-dd in Tashkent (UTC+5, no daylight saving), the snapshot's `day` convention */
export const tashkentDay = (ms: number): string =>
  new Date(ms + 5 * 3600_000).toISOString().slice(0, 10);

/**
 * Wire snapshot → the exact `Db` shape the pages compute with: ISO timestamps → epoch ms, every table sorted by `ts`
 * (ads and plans by day / month), UI-only staff fields defaulted (hue from the id, an equal share split when no share
 * is set, Sunday off, no vacation), and the demo-only fields filled neutrally.
 */
export function hydrate(
  snap: DatasetSnapshot,
  now = Date.now(),
): { db: Db; meta: SnapshotMeta } {
  const t = snap.tables;
  const sales = t.staff.filter((s) => s.sales);
  const shareSet = sales.some((s) => (s.share ?? 0) > 0);
  const equal = sales.length ? Math.round((100 / sales.length) * 10) / 10 : 0;

  const staff: Staff[] = t.staff.map((s) => ({
    id: s.id,
    name: s.name,
    female: false,
    role: s.role as Staff["role"],
    base: 0,
    hue: s.hue ?? hash(s.id) % 360,
    branch: s.branch ?? "",
    hired: "",
    sales: s.sales,
    phone: false,
    skill: 1,
    weekly_off: s.weekly_off ?? [0],
    vacation: s.vacation ?? null,
    share: s.sales ? (shareSet ? (s.share ?? 0) : equal) : 0,
    ...(s.fired ? { fired: true } : {}),
  }));

  // Meta reports a campaign's platform as instagram / facebook (plus messenger / audience_network, which run on Facebook)
  const campaigns: Campaign[] = t.campaigns.map((c) => ({
    ...c,
    platform: /insta/i.test(c.platform) ? "Instagram" : "Facebook",
    product: "",
    start: "",
  }));
  // spend in so'm at its own day's rate (an older snapshot: at the snapshot's one rate)
  const ads: AdDay[] = t.ads
    .map((a) => ({
      ...a,
      spend_uzs: a.spend_uzs ?? a.spend_usd * snap.meta.usdUzs,
    }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  const leads: Lead[] = byTs(
    t.leads.map((l) => {
      const closed =
        l.stage === "won" || l.stage === "lost" || l.stage === "junk";
      const ts = toMs(l.ts);
      return {
        ...l,
        ts,
        product: "",
        branch: "",
        contacted: l.stage !== "new" || l.qualified,
        won: l.stage === "won",
        stage_ts: ts,
        qualified_ts: l.qualified_ts != null ? toMs(l.qualified_ts) : undefined,
        // the closing date the server sends (DATE_CLOSED / stage history); an older snapshot has none: its creation, as before
        closed_ts: closed ? (l.closed_ts != null ? toMs(l.closed_ts) : ts) : null,
        utm_source: l.utm_source ?? "",
        utm_medium: l.utm_medium ?? "",
        // unknown first response = never answered yet: Taqsimot shows "Kutilmoqda" and leaves it out of the median
        first_response_sec: l.first_response_sec ?? Number.POSITIVE_INFINITY,
      };
    }),
  );

  const deals: Deal[] = byTs(
    t.deals.map((d) => {
      const closed = toMsOrNull(d.closed_ts);
      return {
        ...d,
        ts: toMs(d.ts),
        closed_ts: closed,
        // the Tashkent day of the closing (not of the creation); an older snapshot without it: computed here
        closed_day: closed == null ? null : (d.closed_day ?? tashkentDay(closed)),
        lead_id: d.lead_id ?? 0,
        manager_id: "",
        branch: "",
      };
    }),
  );

  const calls: Call[] = withCallbacks(
    byTs(
      t.calls.map((c) => ({
        ...c,
        // an older snapshot sent a short call (10 s of talk or less) as "missed" with the reason "short"
        status:
          c.status === "missed" && c.fail_code === "short" ? "short" : c.status,
        ts: toMs(c.ts),
        recorded: c.recorded ?? false,
        callback_ts: null,
        ne_perezvonili: false,
      })),
    ),
  );
  const payments: Payment[] = byTs(
    t.payments.map((p) => ({
      ...p,
      ts: toMs(p.ts),
      method: p.method as Payment["method"],
    })),
  );
  // chats + POS: optional tables; a snapshot without them gets [] (the pages show an empty state then)
  const conversations: Conversation[] = byTs(
    (t.conversations ?? []).map((c) => ({
      ...c,
      ts: toMs(c.ts),
      last_ts: toMs(c.last_ts) || toMs(c.ts),
      messages_in: c.messages_in ?? 0,
      messages_out: c.messages_out ?? 0,
    })),
  );
  const orders: Order[] = byTs(
    (t.orders ?? []).map((o) => ({
      ...o,
      ts: toMs(o.ts),
      discount: o.discount ?? 0,
      cost: o.cost ?? null,
      items: o.items ?? 0,
    })),
  );
  const orderLines: OrderLine[] = [...(t.orderLines ?? [])];
  const products: Product[] = [...(t.products ?? [])];
  const plans: Plan[] = [...t.plans]
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0))
    .map((p) => ({ ...p, target_deals: 0 }));

  // an older snapshot may start in 1970 (a row without a creation date): "Butun davr" starts at the first real date
  const sent = toMs(snap.meta.dataStart);
  const firstReal = leads.find((l) => l.ts >= REAL_DATES_FROM);
  const start =
    sent >= REAL_DATES_FROM
      ? sent
      : firstReal
        ? startOfDay(firstReal.ts)
        : startOfDay(now);
  const db: Db = {
    staff,
    campaigns,
    ads,
    leads,
    deals,
    calls,
    attendance: [],
    payments,
    plans,
    expenses: [],
    conversations,
    orders,
    orderLines,
    products,
    start,
    end: startOfDay(now) + DAY,
    wsId: `p:${snap.projectId}`,
  };
  const meta: SnapshotMeta = {
    ...snap.meta,
    dataStart: start,
    synthetic: snap.meta.synthetic === true,
    workEndHour: snap.meta.workEndHour ?? DEFAULT_WORK_END_HOUR,
  };
  // the portal's own list / number fields become dataset fields (Grafik qo'shish, AI tavsiyasi)
  setCustomFields(db.wsId, chartableFields(meta.fields, db));
  return { db, meta };
}

// ───────────────────────────── provider + hooks ─────────────────────────────

/**
 * Wrap a dashboard page body. The project source suspends while its snapshot loads (put a <Suspense> and an error
 * boundary around it).
 */
export function DataSourceProvider({
  source,
  children,
}: {
  source: SourceSpec;
  children: ReactNode;
}) {
  if (source.kind === "demo")
    return <Ctx.Provider value={demoSource()}>{children}</Ctx.Provider>;
  return <ProjectSource spec={source}>{children}</ProjectSource>;
}

function ProjectSource({
  spec,
  children,
}: {
  spec: Extract<SourceSpec, { kind: "project" }>;
  children: ReactNode;
}) {
  return (
    <Ctx.Provider value={use(loadSnapshot(spec))}>{children}</Ctx.Provider>
  );
}

/** The current data source; the demo when no provider is mounted (keeps every other screen working). */
export function useDataSource(): DataSourceValue {
  return useContext(Ctx) ?? demoSource();
}

export function useMeta(): SnapshotMeta {
  return useDataSource().meta;
}

/** `null` in the demo; the live slug inside a project (scopes persisted page state). */
export function useProjectSlug(): string | null {
  const { spec } = useDataSource();
  return spec.kind === "project" ? spec.slug : null;
}

/**
 * What became of a missed incoming call ("propushenny"), by customer (last 9 digits), within 7 days after it:
 *  - callback_ts = our FIRST call back attempt — an outgoing call, answered or not — or, if they rang again first and we
 *    picked up, that call. The gap is the "Reaksiya vaqti" (owner, 2026-10-26: "first call back attempt"); callback_by /
 *    callback_by_id = the operator of that call (the speed is theirs, not the missed call's operator's).
 *  - ne_perezvonili = no such call back within 7 days (callback_ts null): the Calls page's "Qayta qo'ng'iroq qilinmagan"
 *    rule, so every block counts the same calls (review 2026-11-04: it was "not reached within 24 h" here).
 * A "short" call (connected, 10 s of talk or less) is no missed call. `calls` are sorted by time.
 */
export function withCallbacks(calls: Call[]): Call[] {
  const WEEK = 7 * 24 * 3600_000;
  const key = (p: string) => p.replace(/\D/g, "").slice(-9);
  const tried = new Map<string, Call[]>();
  for (const c of calls) {
    if (!c.phone) continue;
    const k = key(c.phone);
    if (!k) continue;
    if (c.direction === "out" || c.status === "answered") {
      const a = tried.get(k);
      if (a) a.push(c);
      else tried.set(k, [c]);
    }
  }
  // the first call in `list` (time order) after `ts`, within a week
  const next = (list: Call[] | undefined, ts: number): Call | null => {
    if (!list) return null;
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid]!.ts <= ts) lo = mid + 1;
      else hi = mid;
    }
    return lo < list.length && list[lo]!.ts - ts <= WEEK ? list[lo]! : null;
  };
  return calls.map((c) => {
    if (c.direction !== "in" || c.status !== "missed" || !c.phone) return c;
    const back = next(tried.get(key(c.phone)), c.ts);
    return {
      ...c,
      callback_ts: back?.ts ?? null,
      ...(back ? { callback_by: back.operator, callback_by_id: back.operator_id } : {}),
      ne_perezvonili: back === null,
    };
  });
}
