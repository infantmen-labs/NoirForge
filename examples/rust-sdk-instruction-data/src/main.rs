fn main() {
  let proof_bytes = vec![1u8, 2, 3, 4];
  let public_witness_bytes = vec![9u8, 9, 9];

  let instruction_data = noirforge_sdk::build_instruction_data(&proof_bytes, &public_witness_bytes);

  print!("instruction_data_len={}\n", instruction_data.len());
}
