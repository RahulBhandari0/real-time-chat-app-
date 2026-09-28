const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.json');

function readData() {
  if (!fs.existsSync(dbPath)) {
    return { users: [], messages: [] };
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getUsers() {
  return readData().users;
}

function saveUser(user) {
  const data = readData();
  data.users.push(user);
  writeData(data);
}

function getMessagesByRoom(room) {
  const data = readData();
  return data.messages.filter(m => m.room === room);
}

function saveMessage(msg) {
  const data = readData();
  data.messages.push(msg);
  writeData(data);
}

function deleteMessage(id) {
  const data = readData();
  data.messages = data.messages.filter(m => m.id !== id);
  writeData(data);
}

module.exports = { readData, writeData, getUsers, saveUser, getMessagesByRoom, saveMessage, deleteMessage };