fn main(recipient: pub Field, amount: pub Field, secret: Field, nonce: Field, auth_tag: pub Field) {
    assert(amount * (amount - 1) == 0);
    assert(secret + nonce + recipient + amount == auth_tag);
}

#[test]
fn test_private_transfer_auth() {
    main(10, 1, 7, 5, 23);
}
