fn main(
    sender_0: pub Field,
    sender_1: pub Field,
    recipient_0: pub Field,
    recipient_1: pub Field,
    mint_0: pub Field,
    mint_1: pub Field,
    amount: pub Field,
    secret: Field,
    nonce: Field,
    auth_tag: pub Field,
) {
    assert(
        secret + nonce + sender_0 + sender_1 + recipient_0 + recipient_1 + mint_0 + mint_1 + amount == auth_tag,
    );
}

#[test]
fn test_private_transfer_auth() {
    let sender_0 = 1;
    let sender_1 = 2;
    let recipient_0 = 3;
    let recipient_1 = 4;
    let mint_0 = 5;
    let mint_1 = 6;
    let amount = 7;
    let secret = 11;
    let nonce = 13;
    let auth_tag = secret
        + nonce
        + sender_0
        + sender_1
        + recipient_0
        + recipient_1
        + mint_0
        + mint_1
        + amount;
    main(
        sender_0,
        sender_1,
        recipient_0,
        recipient_1,
        mint_0,
        mint_1,
        amount,
        secret,
        nonce,
        auth_tag,
    );
}
