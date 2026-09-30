// app.js
const express = require('express');
const { saveConfig } = require('./config');
const petsRouter = require('./routes/pets');

const app = express();
app.use(express.json());
app.use('/pets', petsRouter);

const server = app.listen(3000, () => console.log('Listening on port 3000'));

let shuttingDown = false;

function finish(code) {
  try {
    saveConfig();
    console.log('Config saved');
  } catch (err) {
    console.error('Failed to save config:', err);
    code = 1;
  }
  process.exit(code);
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);

  server.close(() => finish(0));

  setTimeout(() => finish(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
app.use(express.json());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");



function checkRoute(req, res, next) {
  const route = req.params.route;

  if (!config.routes.includes(route)) {
    return res.status(404).json({
      error: `Route ${route} not found`
    });
  }

  next();
}

app.get('/', (req, res) => {
  res.render("index", {
    title: "Persons and pets",
    persons: config.persons,
    pets: config.pets,
  })
});

app.get('/:route', checkRoute, (req, res) => {
  const route = req.params.route;
  const data = config[route] || [];

  const embedOwners = req.query.embed === 'owners';

  if (embedOwners) {
    return res.json(getPetsWithOwners());
  }
    
  res.json(data);

});

app.get('/:route/:id', checkRoute, (req, res) => {
  const route = req.params.route;
  const id = req.params.id;
  const data = config[route] || [];

  const record = data.find(item => item.id == id);

  if (!record) {
    return res.status(404).json({
      error: `Record with ID ${id} not found in ${route}`
    });
  }

  const embedOwners = req.query.embed === 'owners';

  if (embedOwners) {
    return res.json({ ...record, owners: getOwnersFor(record) });
  }

  res.json(record);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
