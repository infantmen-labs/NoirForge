fn main(disclosed: pub Field, hidden: Field, commitment: pub Field) {
    assert(disclosed + hidden == commitment);
}

#[test]
fn test_selective_disclosure() {
    main(5, 2, 7);
}
