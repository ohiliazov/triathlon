export enum BaseTypeId {
  ENUM = 0x00,
  SINT8 = 0x01,
  UINT8 = 0x02,
  SINT16 = 0x83,
  UINT16 = 0x84,
  SINT32 = 0x85,
  UINT32 = 0x86,
  STRING = 0x07,
  FLOAT32 = 0x88,
  FLOAT64 = 0x89,
  UINT8Z = 0x0A,
  UINT16Z = 0x8B,
  UINT32Z = 0x8C,
  BYTE = 0x0D,
  SINT64 = 0x8E,
  UINT64 = 0x8F,
  UINT64Z = 0x90,
}

export interface FieldDef {
  fieldDefNumber: number;
  size: number;
  baseTypeId: BaseTypeId;
}

export interface DevFieldDef {
  fieldNumber: number;
  size: number;
  dataIndex: number;
}

export interface DefinitionMessage {
  localMessageType: number;
  globalMessageNumber: number;
  isBigEndian: boolean;
  fieldDefs: FieldDef[];
  devFieldDefs: DevFieldDef[];
}

export interface DataMessage {
  localMessageType: number;
  globalMessageNumber: number;
  fields: Record<number, any>;
}

export class FitParser {
  private view: DataView;
  private offset: number = 0;
  private definitions: Map<number, DefinitionMessage> = new Map();

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  public parse(): DataMessage[] {
    this.parseHeader();
    const messages: DataMessage[] = [];

    while (this.offset < this.view.byteLength - 2) { // 2 bytes for CRC
      const headerByte = this.readUint8();
      const isDefinition = (headerByte & 0x40) !== 0;
      const localMsgType = headerByte & 0x0F;

      if (isDefinition) {
        this.parseDefinition(headerByte, localMsgType);
      } else {
        const msg = this.parseDataMessage(headerByte, localMsgType);
        if (msg) {
          messages.push(msg);
        }
      }
    }

    return messages;
  }

  private parseHeader() {
    const headerSize = this.readUint8();
    if (headerSize !== 12 && headerSize !== 14) {
      throw new Error(`Invalid header size: ${headerSize}`);
    }
    this.offset = headerSize; // Skip the rest of the header for now
  }

  private parseDefinition(headerByte: number, localMsgType: number) {
    this.readUint8(); // Reserved
    const isBigEndian = this.readUint8() === 1;
    const globalMessageNumber = this.readUint16(isBigEndian);
    const numFields = this.readUint8();

    const fieldDefs: FieldDef[] = [];
    for (let i = 0; i < numFields; i++) {
      fieldDefs.push({
        fieldDefNumber: this.readUint8(),
        size: this.readUint8(),
        baseTypeId: this.readUint8() as BaseTypeId,
      });
    }

    const devFieldDefs: DevFieldDef[] = [];
    const hasDevData = (headerByte & 0x20) !== 0;
    if (hasDevData) {
      const numDevFields = this.readUint8();
      for (let i = 0; i < numDevFields; i++) {
        devFieldDefs.push({
          fieldNumber: this.readUint8(),
          size: this.readUint8(),
          dataIndex: this.readUint8(),
        });
      }
    }

    this.definitions.set(localMsgType, {
      localMessageType: localMsgType,
      globalMessageNumber,
      isBigEndian,
      fieldDefs,
      devFieldDefs,
    });
  }

  private parseDataMessage(headerByte: number, localMsgType: number): DataMessage | null {
    const def = this.definitions.get(localMsgType);
    if (!def) {
      return null;
    }

    const fields: Record<number, any> = {};
    for (const fieldDef of def.fieldDefs) {
      const value = this.readValue(fieldDef.baseTypeId, fieldDef.size, def.isBigEndian);
      fields[fieldDef.fieldDefNumber] = value;
    }

    for (const devFieldDef of def.devFieldDefs) {
      // For now we just skip developer fields by moving the offset
      this.offset += devFieldDef.size;
    }

    return {
      localMessageType: localMsgType,
      globalMessageNumber: def.globalMessageNumber,
      fields,
    };
  }

  private readValue(baseTypeId: BaseTypeId, size: number, isBigEndian: boolean): any {
    const startOffset = this.offset;
    let value: any;

    switch (baseTypeId) {
      case BaseTypeId.ENUM:
      case BaseTypeId.UINT8:
      case BaseTypeId.UINT8Z:
      case BaseTypeId.BYTE:
        if (size > 1) {
            value = [];
            for(let i=0; i<size; i++) value.push(this.readUint8());
        } else {
            value = this.readUint8();
            if (value === 0xFF && baseTypeId !== BaseTypeId.UINT8Z) value = null;
        }
        break;
      case BaseTypeId.SINT8:
        value = this.readSint8();
        if (value === 0x7F) value = null;
        break;
      case BaseTypeId.SINT16:
        value = this.readSint16(isBigEndian);
        if (value === 0x7FFF) value = null;
        break;
      case BaseTypeId.UINT16:
      case BaseTypeId.UINT16Z:
        value = this.readUint16(isBigEndian);
        if (value === 0xFFFF && baseTypeId !== BaseTypeId.UINT16Z) value = null;
        break;
      case BaseTypeId.SINT32:
        value = this.readSint32(isBigEndian);
        if (value === 0x7FFFFFFF) value = null;
        break;
      case BaseTypeId.UINT32:
      case BaseTypeId.UINT32Z:
        value = this.readUint32(isBigEndian);
        if (value === 0xFFFFFFFF && baseTypeId !== BaseTypeId.UINT32Z) value = null;
        break;
      case BaseTypeId.FLOAT32:
        value = this.readFloat32(isBigEndian);
        if (isNaN(value)) value = null;
        break;
      case BaseTypeId.FLOAT64:
        value = this.readFloat64(isBigEndian);
        if (isNaN(value)) value = null;
        break;
      case BaseTypeId.STRING:
        value = this.readString(size);
        break;
      default:
        this.offset += size;
        value = null;
    }

    this.offset = startOffset + size;
    return value;
  }

  private readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  private readSint8(): number {
    const val = this.view.getInt8(this.offset);
    this.offset += 1;
    return val;
  }

  private readUint16(isBigEndian: boolean): number {
    const val = this.view.getUint16(this.offset, !isBigEndian);
    this.offset += 2;
    return val;
  }

  private readSint16(isBigEndian: boolean): number {
    const val = this.view.getInt16(this.offset, !isBigEndian);
    this.offset += 2;
    return val;
  }

  private readUint32(isBigEndian: boolean): number {
    const val = this.view.getUint32(this.offset, !isBigEndian);
    this.offset += 4;
    return val;
  }

  private readSint32(isBigEndian: boolean): number {
    const val = this.view.getInt32(this.offset, !isBigEndian);
    this.offset += 4;
    return val;
  }

  private readFloat32(isBigEndian: boolean): number {
    const val = this.view.getFloat32(this.offset, !isBigEndian);
    this.offset += 4;
    return val;
  }

  private readFloat64(isBigEndian: boolean): number {
    const val = this.view.getFloat64(this.offset, !isBigEndian);
    this.offset += 8;
    return val;
  }

  private readString(size: number): string {
    const bytes = new Uint8Array(this.view.buffer, this.offset, size);
    this.offset += size;
    let str = new TextDecoder().decode(bytes);
    const nullIdx = str.indexOf("\0");
    if (nullIdx !== -1) {
      str = str.substring(0, nullIdx);
    }
    return str.trim();
  }
}
