const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const shortid = require('shortid');

require('dotenv').config();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new mongoose.Schema({
	userId: String,
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: String,
});

const userSchema = new mongoose.Schema({
	username: String,
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/api/users/delete', async (_req, res) => {
	try {
		await User.deleteMany({});
		res.json({ message: 'All users have been deleted!' });
	} catch (err) {
		console.error(err);
		res.json({ message: 'Deleting all users failed!' });
	}
});

app.get('/api/exercises/delete', async (_req, res) => {
	try {
		await Exercise.deleteMany({});
		res.json({ message: 'All exercises have been deleted!' });
	} catch (err) {
		console.error(err);
		res.json({ message: 'Deleting all exercises failed!' });
	}
});

app.get('/', async (_req, res) => {
	res.sendFile(__dirname + '/views/index.html');
	await User.syncIndexes();
	await Exercise.syncIndexes();
});

app.get('/api/users', async (_req, res) => {
	try {
		const users = await User.find({});
		if (users.length === 0) {
			res.json({ message: 'There are no users in the database!' });
		} else {
			console.log('users in database: ' + users.length);
			res.json(users);
		}
	} catch (err) {
		console.error(err);
		res.json({ message: 'Getting all users failed!' });
	}
});

app.post('/api/users', async (req, res) => {
	const { username } = req.body;
	try {
		const newUser = await User.create({ username });
		res.json({ username: newUser.username, _id: newUser._id });
	} catch (err) {
		console.error(err);
		res.json({ message: 'User creation failed!' });
	}
});

app.post('/api/users/:_id/exercises', async (req, res) => {
	const { _id } = req.params;
	const { description, duration, date } = req.body;
	try {
		let userInDb = await User.findById(_id);
		if (!date) date = new Date().toISOString().substring(0, 10);
		const newExercise = await Exercise.create({
			userId: userInDb._id,
			username: userInDb.username,
			description,
			duration: parseInt(duration),
			date,
		});
		res.json({
			username: userInDb.username,
			description: newExercise.description,
			duration: newExercise.duration,
			date: new Date(newExercise.date).toDateString(),
			_id: userInDb._id,
		});
	} catch (err) {
		console.error(err);
		res.json({ message: 'Exercise creation failed!' });
	}
});

app.get('/api/users/:_id/logs', async (req, res) => {
	const { _id } = req.params;
	const from = req.query.from || new Date(0).toISOString().substring(0, 10);
	const to = req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
	const limit = Number(req.query.limit) || 0;
	try {
		const user = await User.findById(_id);
		const exercises = await Exercise.find({
			userId: _id,
			date: { $gte: from, $lte: to },
		})
			.select('description duration date')
			.limit(limit);
		const parsedDatesLog = exercises.map((exercise) => ({
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
		}));
		res.json({
			_id: user._id,
			username: user.username,
			count: parsedDatesLog.length,
			log: parsedDatesLog,
		});
	} catch (err) {
		console.error(err);
		res.json({ message: 'Failed to retrieve user exercises!' });
	}
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
