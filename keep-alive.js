
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive! 🤖');
});

app.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

export function startKeepAlive() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Keep-alive server running on port ${PORT}`);
  });
}
