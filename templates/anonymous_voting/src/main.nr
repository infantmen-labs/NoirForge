fn main(vote: Field, nonce: Field, encrypted_vote: pub Field) {
    assert(vote * (vote - 1) == 0);
    assert(vote + nonce == encrypted_vote);
}

#[test]
fn test_valid_ballot() {
    main(1, 42, 43);
}
