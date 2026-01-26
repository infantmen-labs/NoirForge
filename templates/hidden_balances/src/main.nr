fn main(old_commitment: pub Field, new_commitment: pub Field, delta: pub Field, old_balance: Field, old_nonce: Field, new_balance: Field, new_nonce: Field) {
    assert(old_balance + old_nonce == old_commitment);
    assert(new_balance + new_nonce == new_commitment);
    assert(old_balance + delta == new_balance);
}

#[test]
fn test_hidden_balances() {
    main(15, 19, 4, 10, 5, 14, 5);
}
