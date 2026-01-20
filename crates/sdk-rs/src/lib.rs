use solana_program::instruction::Instruction;
use solana_program::pubkey::Pubkey;

pub fn build_instruction_data(proof_bytes: &[u8], public_witness_bytes: &[u8]) -> Vec<u8> {
  let mut out = Vec::with_capacity(proof_bytes.len() + public_witness_bytes.len());
  out.extend_from_slice(proof_bytes);
  out.extend_from_slice(public_witness_bytes);
  out
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DecodeError {
  TooShort,
  InvalidLength,
}

impl core::fmt::Display for DecodeError {
  fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
    match self {
      DecodeError::TooShort => write!(f, "too short"),
      DecodeError::InvalidLength => write!(f, "invalid length"),
    }
  }
}

impl std::error::Error for DecodeError {}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicWitness {
  pub header: [u8; 12],
  pub inputs: Vec<[u8; 32]>,
}

pub fn parse_public_witness(public_witness_bytes: &[u8]) -> Result<PublicWitness, DecodeError> {
  if public_witness_bytes.len() < 12 {
    return Err(DecodeError::TooShort);
  }
  let mut header = [0u8; 12];
  header.copy_from_slice(&public_witness_bytes[..12]);

  let rest = &public_witness_bytes[12..];
  if rest.len() % 32 != 0 {
    return Err(DecodeError::InvalidLength);
  }

  let mut inputs = Vec::with_capacity(rest.len() / 32);
  for chunk in rest.chunks(32) {
    let mut el = [0u8; 32];
    el.copy_from_slice(chunk);
    inputs.push(el);
  }

  Ok(PublicWitness { header, inputs })
}

pub fn split_instruction_data(
  instruction_data: &[u8],
  public_witness_len: usize,
) -> Result<(Vec<u8>, Vec<u8>), DecodeError> {
  if instruction_data.len() < public_witness_len {
    return Err(DecodeError::TooShort);
  }
  let proof_len = instruction_data.len() - public_witness_len;
  let proof = instruction_data[..proof_len].to_vec();
  let witness = instruction_data[proof_len..].to_vec();
  Ok((proof, witness))
}

pub fn build_verify_instruction(program_id: Pubkey, proof_bytes: &[u8], public_witness_bytes: &[u8]) -> Instruction {
  Instruction {
    program_id,
    accounts: vec![],
    data: build_instruction_data(proof_bytes, public_witness_bytes),
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn instruction_data_is_concatenation() {
    let a = vec![1u8, 2, 3];
    let b = vec![4u8, 5];
    assert_eq!(build_instruction_data(&a, &b), vec![1u8, 2, 3, 4, 5]);
  }

  #[test]
  fn verify_instruction_has_no_accounts() {
    let pid = Pubkey::new_unique();
    let ix = build_verify_instruction(pid, &[9u8], &[10u8, 11u8]);
    assert_eq!(ix.program_id, pid);
    assert!(ix.accounts.is_empty());
    assert_eq!(ix.data, vec![9u8, 10u8, 11u8]);
  }

  #[test]
  fn parse_public_witness_splits_header_and_inputs() {
    let mut bytes = Vec::new();
    bytes.extend_from_slice(&[7u8; 12]);
    bytes.extend_from_slice(&[1u8; 32]);
    bytes.extend_from_slice(&[2u8; 32]);
    let pw = parse_public_witness(&bytes).unwrap();
    assert_eq!(pw.header, [7u8; 12]);
    assert_eq!(pw.inputs.len(), 2);
    assert_eq!(pw.inputs[0], [1u8; 32]);
    assert_eq!(pw.inputs[1], [2u8; 32]);
  }

  #[test]
  fn parse_public_witness_rejects_invalid_lengths() {
    assert_eq!(parse_public_witness(&[0u8; 11]).unwrap_err(), DecodeError::TooShort);
    assert_eq!(parse_public_witness(&[0u8; 13]).unwrap_err(), DecodeError::InvalidLength);
  }

  #[test]
  fn split_instruction_data_roundtrips() {
    let proof = vec![1u8, 2, 3, 4];
    let witness = vec![9u8, 9, 9];
    let data = build_instruction_data(&proof, &witness);
    let (p2, w2) = split_instruction_data(&data, witness.len()).unwrap();
    assert_eq!(p2, proof);
    assert_eq!(w2, witness);
  }

  #[test]
  fn split_instruction_data_rejects_too_short() {
    let data = vec![1u8, 2, 3];
    assert_eq!(split_instruction_data(&data, 4).unwrap_err(), DecodeError::TooShort);
  }
}
