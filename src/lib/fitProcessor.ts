import { FitParser } from "./fitParser";
import { MesgNum, PROFILE } from "./fitProfile";

const FIT_EPOCH_MS = 631065600000;

export interface ProcessedActivity {
  records: any[];
  laps: any[];
  session: any;
}

export function processFitFile(buffer: ArrayBuffer): ProcessedActivity {
  const parser = new FitParser(buffer);
  const messages = parser.parse();

  const records: any[] = [];
  const laps: any[] = [];
  let session: any = null;

  for (const msg of messages) {
    const profileFields = PROFILE[msg.globalMessageNumber];
    const processedFields: any = {};

    for (const [id, value] of Object.entries(msg.fields)) {
      const fieldId = parseInt(id);
      const fieldDef = profileFields ? profileFields[fieldId] : null;

      if (fieldDef) {
        let finalValue = value;
        if (typeof value === "number" && value !== null) {
          finalValue = (value / (fieldDef.scale || 1)) - (fieldDef.offset || 0);
        }

        if (fieldDef.name === "timestamp" || fieldDef.name === "start_time") {
          finalValue = new Date(FIT_EPOCH_MS + finalValue * 1000).toISOString();
        }
        processedFields[fieldDef.name] = finalValue;
      } else {
        processedFields[`field_${id}`] = value;
      }
    }

    // Prefer enhanced fields when available
    if (msg.globalMessageNumber === MesgNum.RECORD) {
      if (processedFields.enhanced_speed !== undefined) {
        processedFields.speed = processedFields.enhanced_speed;
      }
      if (processedFields.enhanced_altitude !== undefined) {
        processedFields.altitude = processedFields.enhanced_altitude;
      }
      records.push(processedFields);
    } else if (msg.globalMessageNumber === MesgNum.LAP) {
      if (processedFields.enhanced_avg_speed !== undefined) {
        processedFields.avg_speed = processedFields.enhanced_avg_speed;
      }
      if (processedFields.enhanced_max_speed !== undefined) {
        processedFields.max_speed = processedFields.enhanced_max_speed;
      }
      laps.push(processedFields);
    } else if (msg.globalMessageNumber === MesgNum.SESSION) {
      if (processedFields.enhanced_avg_speed !== undefined) {
        processedFields.avg_speed = processedFields.enhanced_avg_speed;
      }
      if (processedFields.enhanced_max_speed !== undefined) {
        processedFields.max_speed = processedFields.enhanced_max_speed;
      }
      session = processedFields;
    }
  }

  return { records, laps, session };
}
