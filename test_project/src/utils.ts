export function calculateSum(a: number, b: number): number {
  return a + b;
}

export function formatUserName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export class UserService {
  private users: Array<{ id: number; name: string; email: string }> = [];

  addUser(name: string, email: string) {
    const user = {
      id: this.users.length + 1,
      name,
      email,
    };
    this.users.push(user);
    return user;
  }

  getUsers() {
    return [...this.users];
  }

  findUserById(id: number) {
    return this.users.find((user) => user.id === id);
  }
}
