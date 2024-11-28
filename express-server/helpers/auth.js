export function findUser(email) {
    return db.data.users.find(user => user.email === email);
}

