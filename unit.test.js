function validatePassword(password) {
  return password.length >= 4;
}

function validateUsername(username) {
  return username.length > 0;
}

test("valid password", () => {
  expect(validatePassword("1234")).toBe(true);
});

test("invalid password", () => {
  expect(validatePassword("123")).toBe(false);
});

test("valid username", () => {
  expect(validateUsername("greed")).toBe(true);
});

test("invalid username", () => {
  expect(validateUsername("")).toBe(false);
});
