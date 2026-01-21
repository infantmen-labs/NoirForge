export type NoirforgeManifestV1 = {
  schema_version: 1;
  name: string;
  created_at: string;
  circuit_dir: string | null;
  proving_system: string;
  outputs: Record<string, string | null>;
  outputs_rel?: Record<string, string | null>;
  hashes?: Record<string, string>;
  toolchain?: Record<string, string>;
};

export function validateManifestV1(
  x: unknown
): { ok: true; manifest: NoirforgeManifestV1 } | { ok: false; errors: string[] };

export function resolveOutputs(manifest: any, artifactDir: string): Record<string, unknown>;

export function buildInstructionData(proofBytes: Buffer | Uint8Array, publicWitnessBytes: Buffer | Uint8Array): Buffer;
