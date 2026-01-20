fn main(secret: Field, token: pub Field) {
    assert(secret * secret == token);
}

#[test]
fn test_gate_allows_valid_secret() {
    main(3, 9);
}
