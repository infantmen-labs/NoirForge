fn main(a: Field, b: Field) -> pub Field {
    a + b
}

#[test]
fn test_sum_a_b() {
    let out = main(1, 2);
    assert(out == 3);
}
