const request = require("supertest");
const app = require("../backend/server");

describe("Create Room API", () => {

  test("should create room successfully", async () => {
    const res = await request(app)
      .post("/create-room")
      .send({ username: "greed", password: "1234" });

    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Room created");
  });

  test("should fail if username is empty", async () => {
    const res = await request(app)
      .post("/create-room")
      .send({ username: "", password: "1234" });

    expect(res.statusCode).toBe(400);
  });

  test("should fail if password is too short", async () => {
    const res = await request(app)
      .post("/create-room")
      .send({ username: "greed", password: "123" });

    expect(res.statusCode).toBe(400);
  });

});
