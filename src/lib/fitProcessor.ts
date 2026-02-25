import { Decoder, Stream } from "@garmin/fitsdk";

export interface ProcessedActivity {
  records: any[];
  laps: any[];
  session: any;
  hr_zones?: { high_bpm: number | null; name?: string | null }[];
}

function camelToSnake(name: string): string {
  return name
    .replace(/([A-Z])/g, "_$1")
    .replace(/__/g, "_")
    .toLowerCase();
}

function normalizeMessage(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = camelToSnake(k);
    if (v instanceof Date) {
      out[key] = v.toISOString();
    } else if (Array.isArray(v)) {
      out[key] = v.map((x) => (x instanceof Date ? x.toISOString() : x));
    } else {
      out[key] = v;
    }
  }
  return out;
}

export function processFitFile(buffer: ArrayBuffer): ProcessedActivity {
  const stream = Stream.fromArrayBuffer(buffer);
  const decoder = new Decoder(stream);
  const { messages } = decoder.read();

  const recordsRaw: any[] = (messages as any).recordMesgs || [];
  const lapsRaw: any[] = (messages as any).lapMesgs || [];
  const sessionsRaw: any[] = (messages as any).sessionMesgs || [];

  const records = recordsRaw.map((m) => {
    const msg = normalizeMessage(m);
    if (typeof msg.enhanced_speed === "number") msg.speed = msg.enhanced_speed;
    if (typeof msg.enhanced_altitude === "number") msg.altitude = msg.enhanced_altitude;
    return msg;
  });

  const laps = lapsRaw.map((m) => {
    const msg = normalizeMessage(m);
    if (typeof msg.enhanced_avg_speed === "number") msg.avg_speed = msg.enhanced_avg_speed;
    if (typeof msg.enhanced_max_speed === "number") msg.max_speed = msg.enhanced_max_speed;
    return msg;
  });

  let session: any = null;
  if (sessionsRaw.length > 0) {
    const s = normalizeMessage(sessionsRaw[0]);
    if (typeof s.enhanced_avg_speed === "number") s.avg_speed = s.enhanced_avg_speed;
    if (typeof s.enhanced_max_speed === "number") s.max_speed = s.enhanced_max_speed;
    session = s;
  }

  // Optional: derive HR zones if present in SDK output (hrZoneMesgs) — keep undefined if not present
  const hrZoneMesgs: any[] = (messages as any).hrZoneMesgs || [];
  const hr_zones = hrZoneMesgs.map((z) => {
    const zn = normalizeMessage(z);
    const high = typeof zn.high_bpm === "number" ? zn.high_bpm : null;
    const name = typeof zn.name === "string" ? zn.name : null;
    return { high_bpm: high, name };
  });

  const sortedZones = hr_zones
    .filter((z) => z.high_bpm !== null)
    .sort((a, b) => (a.high_bpm! - b.high_bpm!));

  return {
    records,
    laps,
    session,
    hr_zones: sortedZones.length ? sortedZones : (hr_zones.length ? hr_zones : undefined),
  };
}
