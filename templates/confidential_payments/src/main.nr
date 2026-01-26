fn main(old_commitment: pub u32, new_commitment: pub u32, amount_commitment: pub u32, old_balance: u32, new_balance: u32, amount: u32, nonce: u32) {
    assert(old_balance >= amount);
    assert(new_balance + amount == old_balance);

    assert(old_balance + nonce == old_commitment);
    assert(new_balance + nonce == new_commitment);
    assert(amount + nonce == amount_commitment);
}

#[test]
fn test_confidential_payments() {
    main(55, 45, 25, 40, 30, 10, 15);
}
