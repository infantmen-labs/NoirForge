function isPlainObject(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isStringRecordOrNull(x) {
  if (!isPlainObject(x)) return false;
  for (const v of Object.values(x)) {
    if (typeof v !== 'string' && v !== null) return false;
  }
  return true;
}

function isStringRecord(x) {
  if (!isPlainObject(x)) return false;
  for (const v of Object.values(x)) {
    if (typeof v !== 'string') return false;
  }
  return true;
}

function validateManifestV1(x) {
  const errors = [];

  if (!isPlainObject(x)) {
    return { ok: false, errors: ['manifest must be an object'] };
  }

  const schemaVersion = x.schema_version;
  if (schemaVersion !== 1) {
    errors.push('schema_version must be 1');
  }

  const name = x.name;
  if (typeof name !== 'string' || name.length === 0) {
    errors.push('name must be a non-empty string');
  }

  const createdAt = x.created_at;
  if (typeof createdAt !== 'string' || createdAt.length === 0) {
    errors.push('created_at must be a non-empty string');
  }

  const circuitDir = x.circuit_dir;
  if (typeof circuitDir !== 'string' && circuitDir !== null) {
    errors.push('circuit_dir must be a string or null');
  }

  const provingSystem = x.proving_system;
  if (typeof provingSystem !== 'string' || provingSystem.length === 0) {
    errors.push('proving_system must be a non-empty string');
  }

  const outputs = x.outputs;
  if (!isStringRecordOrNull(outputs)) {
    errors.push('outputs must be an object whose values are string|null');
  }

  const outputsRel = x.outputs_rel;
  if (outputsRel != null && !isStringRecordOrNull(outputsRel)) {
    errors.push('outputs_rel must be an object whose values are string|null');
  }

  const hashes = x.hashes;
  if (hashes != null && !isStringRecord(hashes)) {
    errors.push('hashes must be an object whose values are string');
  }

  const toolchain = x.toolchain;
  if (toolchain != null && !isStringRecord(toolchain)) {
    errors.push('toolchain must be an object whose values are string');
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, manifest: x };
}

function isMetadataKey(k) {
  return (
    k.endsWith('_id') ||
    k.endsWith('_signature') ||
    k.endsWith('_cluster') ||
    k.includes('signature') ||
    k.includes('cluster')
  );
}

function resolveOutputs(manifest, artifactDir) {
  const path = require('node:path');

  const outputs = (manifest && manifest.outputs) || {};
  const outputsRel = (manifest && manifest.outputs_rel) || {};

  const resolved = { ...outputs };

  for (const [k, v] of Object.entries(outputsRel)) {
    if (typeof v === 'string') {
      resolved[k] = isMetadataKey(k) ? v : path.resolve(artifactDir, v);
    } else {
      resolved[k] = v;
    }
  }

  return resolved;
}

function buildInstructionData(proofBytes, publicWitnessBytes) {
  const a = Buffer.isBuffer(proofBytes) ? proofBytes : Buffer.from(proofBytes);
  const b = Buffer.isBuffer(publicWitnessBytes) ? publicWitnessBytes : Buffer.from(publicWitnessBytes);
  return Buffer.concat([a, b]);
}

module.exports = {
  buildInstructionData,
  resolveOutputs,
  validateManifestV1,
};
