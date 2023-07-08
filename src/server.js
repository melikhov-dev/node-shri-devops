import express, { urlencoded } from 'express';
import dotenv from 'dotenv';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { getPool } from './db.js';

dotenv.config();

const pool = getPool();

const app = express();
app.use(urlencoded({ encoded: true }));

const { PORT } = process.env;

app.get(['/', '/login'], (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  const htmlStream = createReadStream(new URL('view/login.html', import.meta.url));
  htmlStream.pipe(res);
});

app.post('/login', async (req, res, next) => {
  const formData = req.body;
  if (!formData.username || !formData.password) {
    return next(new Error(400));
  }
  try {
    const response = await pool.query('SELECT * FROM users WHERE name=$1', [formData.username]);
    const pswwd = createHash('sha1').update(formData.password).digest('hex');
    if (response.rows.length === 0) {
      res.send('NO WAY');
    } else if (response.rows[0].password === pswwd) {
      res.send('OK');
    } else {
      res.send('Hacker!');
    }
    return undefined;
  } catch (e) {
    return next(e);
  }
});

app.get('/registration', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  const htmlStream = createReadStream(new URL('view/registration.html', import.meta.url));
  htmlStream.pipe(res);
});

app.post('/registration', async (req, res, next) => {
  const formData = req.body;
  if (!formData.username || !formData.password) {
    return next(new Error(400));
  }
  try {
    const pswwd = createHash('sha1').update(formData.password).digest('hex');
    await pool.query('INSERT INTO users (name, password) VALUES ($1, $2)', [formData.username, pswwd]);
    res.end('ok');
    return undefined;
  } catch (e) {
    return next(e);
  }
});

app.use((err, req, res, next) => {
  if (err.message === '400') {
    res.status(400).end('Bad request');
  } else {
    next(err);
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(500).end(JSON.stringify(err));
});

app.listen(PORT, (err) => {
  if (err) {
    console.error(err);
    process.exit(0);
  }
  console.info(`Server is listening port ${PORT}`);
});
