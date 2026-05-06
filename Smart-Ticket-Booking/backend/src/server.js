require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

connectDB();

const app = express();

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173',
    'http://localhost:3000',
    'https://your-frontend-url.onrender.com',
    'https://your-frontend-url.vercel.app'], credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.get('/', (req, res) => {
	res.json({
		success: true,
		message: 'Smart Ticket Backend API Running',
	});
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/company', require('./routes/company'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/chat', require('./routes/chat'));

app.get('/docs', (req, res) => {
	res.type('html').send(`
		<!doctype html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Smart Ticket Booking API Docs</title>
				<style>
					body {
						font-family: Arial, sans-serif;
						margin: 0;
						padding: 40px;
						background: #f7f9fc;
						color: #1f2937;
					}
					.card {
						max-width: 760px;
						margin: 0 auto;
						background: #fff;
						border-radius: 16px;
						padding: 32px;
						box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
					}
					h1 { margin-top: 0; }
					a { color: #2563eb; }
					code { background: #eef2ff; padding: 2px 6px; border-radius: 6px; }
				</style>
			</head>
			<body>
				<div class="card">
					<h1>Smart Ticket Booking API</h1>
					<p>The Node.js backend does not expose Swagger/OpenAPI here. Use the endpoints below or open the chatbot service docs.</p>
					<ul>
						<li><code>/api/health</code> - backend health check</li>
						<li><code>/api/auth</code> - authentication routes</li>
						<li><code>/api/admin</code> - admin routes</li>
						<li><code>/api/company</code> - company routes</li>
						<li><code>/api/services</code> - service routes</li>
						<li><code>/api/bookings</code> - booking routes</li>
						<li><code>/api/chat</code> - chat route</li>
					</ul>
					<p>Chatbot service docs: <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">http://localhost:8000/docs</a></p>
				</div>
			</body>
		</html>
	`);
});

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
