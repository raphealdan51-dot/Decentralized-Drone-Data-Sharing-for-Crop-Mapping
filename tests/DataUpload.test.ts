import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, stringUtf8CV, uintCV, intCV, tupleCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_DATA_HASH = 101;
const ERR_INVALID_METADATA = 102;
const ERR_INVALID_LOCATION = 103;
const ERR_INVALID_CROP_TYPE = 104;
const ERR_INVALID_CAPTURE_DATE = 105;
const ERR_INVALID_PRICE = 106;
const ERR_DATA_ALREADY_EXISTS = 107;
const ERR_DATA_NOT_FOUND = 108;
const ERR_INVALID_DATA_TYPE = 111;
const ERR_INVALID_RESOLUTION = 112;
const ERR_INVALID_COORDINATES = 117;
const ERR_INVALID_SENSOR_TYPE = 118;
const ERR_INVALID_DATA_FORMAT = 116;
const ERR_MAX_DATA_ENTRIES_EXCEEDED = 115;
const ERR_INVALID_UPDATE_PARAM = 114;
const ERR_AUTHORITY_NOT_VERIFIED = 110;

interface DataEntry {
  dataHash: string;
  metadata: string;
  location: string;
  cropType: string;
  captureDate: number;
  price: number;
  timestamp: number;
  owner: string;
  dataType: string;
  resolution: number;
  coordinates: { lat: number; lon: number };
  sensorType: string;
  format: string;
  status: boolean;
}

interface DataUpdate {
  updateMetadata: string;
  updatePrice: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class DataUploadMock {
  state: {
    nextDataId: number;
    maxDataEntries: number;
    uploadFee: number;
    authorityContract: string | null;
    dataUploads: Map<number, DataEntry>;
    dataUpdates: Map<number, DataUpdate>;
    dataByHash: Map<string, number>;
  } = {
    nextDataId: 0,
    maxDataEntries: 10000,
    uploadFee: 100,
    authorityContract: null,
    dataUploads: new Map(),
    dataUpdates: new Map(),
    dataByHash: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextDataId: 0,
      maxDataEntries: 10000,
      uploadFee: 100,
      authorityContract: null,
      dataUploads: new Map(),
      dataUpdates: new Map(),
      dataByHash: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setUploadFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.uploadFee = newFee;
    return { ok: true, value: true };
  }

  registerData(
    dataHash: string,
    metadata: string,
    location: string,
    cropType: string,
    captureDate: number,
    price: number,
    dataType: string,
    resolution: number,
    coordinates: { lat: number; lon: number },
    sensorType: string,
    format: string
  ): Result<number> {
    if (this.state.nextDataId >= this.state.maxDataEntries) return { ok: false, value: ERR_MAX_DATA_ENTRIES_EXCEEDED };
    if (!dataHash || dataHash.length > 64) return { ok: false, value: ERR_INVALID_DATA_HASH };
    if (!metadata || metadata.length > 500) return { ok: false, value: ERR_INVALID_METADATA };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["wheat", "corn", "rice", "soybean"].includes(cropType)) return { ok: false, value: ERR_INVALID_CROP_TYPE };
    if (captureDate <= 0) return { ok: false, value: ERR_INVALID_CAPTURE_DATE };
    if (price < 0) return { ok: false, value: ERR_INVALID_PRICE };
    if (!["ndvi", "aerial", "thermal"].includes(dataType)) return { ok: false, value: ERR_INVALID_DATA_TYPE };
    if (resolution <= 0 || resolution > 10000) return { ok: false, value: ERR_INVALID_RESOLUTION };
    if (coordinates.lat < -90 || coordinates.lat > 90 || coordinates.lon < -180 || coordinates.lon > 180) return { ok: false, value: ERR_INVALID_COORDINATES };
    if (!["drone", "satellite", "ground"].includes(sensorType)) return { ok: false, value: ERR_INVALID_SENSOR_TYPE };
    if (!["geojson", "tiff", "jpeg"].includes(format)) return { ok: false, value: ERR_INVALID_DATA_FORMAT };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.dataByHash.has(dataHash)) return { ok: false, value: ERR_DATA_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.uploadFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextDataId;
    const entry: DataEntry = {
      dataHash,
      metadata,
      location,
      cropType,
      captureDate,
      price,
      timestamp: this.blockHeight,
      owner: this.caller,
      dataType,
      resolution,
      coordinates,
      sensorType,
      format,
      status: true,
    };
    this.state.dataUploads.set(id, entry);
    this.state.dataByHash.set(dataHash, id);
    this.state.nextDataId++;
    return { ok: true, value: id };
  }

  getData(id: number): DataEntry | null {
    return this.state.dataUploads.get(id) || null;
  }

  updateMetadata(id: number, newMetadata: string, newPrice: number): Result<boolean> {
    const data = this.state.dataUploads.get(id);
    if (!data) return { ok: false, value: false };
    if (data.owner !== this.caller) return { ok: false, value: false };
    if (!newMetadata || newMetadata.length > 500) return { ok: false, value: false };
    if (newPrice < 0) return { ok: false, value: false };

    const updated: DataEntry = {
      ...data,
      metadata: newMetadata,
      price: newPrice,
      timestamp: this.blockHeight,
    };
    this.state.dataUploads.set(id, updated);
    this.state.dataUpdates.set(id, {
      updateMetadata: newMetadata,
      updatePrice: newPrice,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getDataCount(): Result<number> {
    return { ok: true, value: this.state.nextDataId };
  }

  checkDataExistence(hash: string): Result<boolean> {
    return { ok: true, value: this.state.dataByHash.has(hash) };
  }

  getDataByHash(hash: string): DataEntry | null {
    const id = this.state.dataByHash.get(hash);
    return id !== undefined ? this.getData(id) : null;
  }
}

describe("DataUpload", () => {
  let contract: DataUploadMock;

  beforeEach(() => {
    contract = new DataUploadMock();
    contract.reset();
  });

  it("registers data successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerData(
      "abc123",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const data = contract.getData(0);
    expect(data?.dataHash).toBe("abc123");
    expect(data?.metadata).toBe("Sample metadata");
    expect(data?.location).toBe("Farm A");
    expect(data?.cropType).toBe("wheat");
    expect(data?.captureDate).toBe(1234567890);
    expect(data?.price).toBe(50);
    expect(data?.dataType).toBe("ndvi");
    expect(data?.resolution).toBe(1000);
    expect(data?.coordinates).toEqual({ lat: 40, lon: -75 });
    expect(data?.sensorType).toBe("drone");
    expect(data?.format).toBe("tiff");
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate data hashes", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerData(
      "abc123",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    const result = contract.registerData(
      "abc123",
      "New metadata",
      "Farm B",
      "corn",
      1234567891,
      100,
      "aerial",
      2000,
      { lat: 41, lon: -76 },
      "satellite",
      "geojson"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DATA_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const result = contract.registerData(
      "def456",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("parses data hash with Clarity", () => {
    const cv = stringAsciiCV("ghi789");
    expect(cv.value).toBe("ghi789");
  });

  it("rejects data registration without authority contract", () => {
    const result = contract.registerData(
      "jkl012",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid data hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerData(
      "",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DATA_HASH);
  });

  it("rejects invalid metadata", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerData(
      "abc123",
      "",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_METADATA);
  });

  it("rejects invalid crop type", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerData(
      "abc123",
      "Sample metadata",
      "Farm A",
      "invalid",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CROP_TYPE);
  });

  it("updates metadata successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerData(
      "abc123",
      "Old metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    const result = contract.updateMetadata(0, "New metadata", 100);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const data = contract.getData(0);
    expect(data?.metadata).toBe("New metadata");
    expect(data?.price).toBe(100);
    const update = contract.state.dataUpdates.get(0);
    expect(update?.updateMetadata).toBe("New metadata");
    expect(update?.updatePrice).toBe(100);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent data", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateMetadata(99, "New metadata", 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-owner", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerData(
      "abc123",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateMetadata(0, "New metadata", 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets upload fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setUploadFee(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.uploadFee).toBe(200);
    contract.registerData(
      "abc123",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    expect(contract.stxTransfers).toEqual([{ amount: 200, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects upload fee change without authority contract", () => {
    const result = contract.setUploadFee(200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct data count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerData(
      "abc123",
      "Sample1",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    contract.registerData(
      "def456",
      "Sample2",
      "Farm B",
      "corn",
      1234567891,
      100,
      "aerial",
      2000,
      { lat: 41, lon: -76 },
      "satellite",
      "geojson"
    );
    const result = contract.getDataCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks data existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerData(
      "abc123",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    const result = contract.checkDataExistence("abc123");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkDataExistence("nonexistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects data registration with empty hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.registerData(
      "",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DATA_HASH);
  });

  it("rejects data registration with max entries exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxDataEntries = 1;
    contract.registerData(
      "abc123",
      "Sample1",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    const result = contract.registerData(
      "def456",
      "Sample2",
      "Farm B",
      "corn",
      1234567891,
      100,
      "aerial",
      2000,
      { lat: 41, lon: -76 },
      "satellite",
      "geojson"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_DATA_ENTRIES_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("gets data by hash successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.registerData(
      "abc123",
      "Sample metadata",
      "Farm A",
      "wheat",
      1234567890,
      50,
      "ndvi",
      1000,
      { lat: 40, lon: -75 },
      "drone",
      "tiff"
    );
    const data = contract.getDataByHash("abc123");
    expect(data?.dataHash).toBe("abc123");
    expect(data?.metadata).toBe("Sample metadata");
  });

  it("returns null for non-existent hash", () => {
    const data = contract.getDataByHash("nonexistent");
    expect(data).toBe(null);
  });
});