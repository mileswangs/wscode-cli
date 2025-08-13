const request = require("supertest");
const app = require("../index");

describe("API Tests", () => {
  test("GET / should return hello world", async () => {
    const response = await request(app).get("/").expect(200);

    expect(response.body.message).toBe("Hello World!");
  });

  test("GET /users should return users array", async () => {
    const response = await request(app).get("/users").expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
  });

  test("POST /users should create new user", async () => {
    const newUser = {
      name: "Test User",
      email: "test@example.com",
    };

    const response = await request(app)
      .post("/users")
      .send(newUser)
      .expect(201);

    expect(response.body.name).toBe(newUser.name);
    expect(response.body.email).toBe(newUser.email);
    expect(response.body.id).toBeDefined();
  });
});
