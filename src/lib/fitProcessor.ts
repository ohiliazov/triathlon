import { Decoder, Stream } from "@garmin/fitsdk";

export interface ProcessedActivity {
  records: any[];
  laps: any[];
  session: any;
  hr_zones?: { high_bpm: number | null; name?: string | null }[];
  workout_steps?: any[];
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
  const workoutStepsRaw: any[] = (messages as any).workoutStepMesgs || [];

  const workout_steps = workoutStepsRaw.map((m) => normalizeMessage(m));

  const records = recordsRaw
    .map((m) => normalizeMessage(m))
    .filter((m) => m.timestamp)
    .map((msg) => {
      if (typeof msg.enhanced_speed === "number") msg.speed = msg.enhanced_speed;
      if (typeof msg.enhanced_altitude === "number") msg.altitude = msg.enhanced_altitude;
      return msg;
    });

  const laps = lapsRaw
    .map((m) => normalizeMessage(m))
    .filter((m) => m.timestamp)
    .map((msg) => {
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
  let hr_zones: { high_bpm: number | null; name?: string | null }[] = hrZoneMesgs.map((z) => {
    const zn = normalizeMessage(z);
    const high = typeof zn.high_bpm === "number" ? zn.high_bpm : null;
    const name = typeof zn.name === "string" ? zn.name : null;
    return { high_bpm: high, name };
  });

  // Fallback to timeInZoneMesgs if hrZoneMesgs is empty
  if (hr_zones.length === 0 && (messages as any).timeInZoneMesgs) {
    const tizMsgs = (messages as any).timeInZoneMesgs;
    const sessionTiz = tizMsgs.find((m: any) => m.referenceMesg === "session" || m.referenceMesg === 18);
    const tiz = sessionTiz || tizMsgs[0];

    if (tiz && Array.isArray(tiz.hrZoneHighBoundary) && tiz.hrZoneHighBoundary.length >= 6) {
      const b = tiz.hrZoneHighBoundary;
      hr_zones = [
        { high_bpm: b[0] - 1, name: "Zone 0" },
        { high_bpm: b[1] - 1, name: "Zone 1" },
        { high_bpm: b[2] - 1, name: "Zone 2" },
        { high_bpm: b[3] - 1, name: "Zone 3" },
        { high_bpm: b[4] - 1, name: "Zone 4" },
        { high_bpm: b[5], name: "Zone 5" },
      ];
    }
  }

  const sortedZones = hr_zones
    .filter((z) => z.high_bpm !== null)
    .sort((a, b) => (a.high_bpm! - b.high_bpm!));

  return {
    records,
    laps,
    session,
    hr_zones: sortedZones.length ? sortedZones : (hr_zones.length ? hr_zones : undefined),
    workout_steps: workout_steps.length ? workout_steps : undefined,
  };
}
