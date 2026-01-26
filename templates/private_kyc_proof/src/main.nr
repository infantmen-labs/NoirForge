fn main(commitment: pub u32, min_age: pub u32, age: u32, nonce: u32) {
    assert(age >= min_age);
    assert(age + nonce == commitment);
}

#[test]
fn test_private_kyc_proof() {
    main(123, 18, 21, 102);
}
