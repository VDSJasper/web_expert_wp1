const express = require('express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const CONFIG = process.argv.slice(2)[0] || 'config.yaml';

let config;

try {
  config = yaml.load(
    fs.readFileSync(path.join(__dirname, CONFIG), 'utf8')
  );
} catch (error) {
  console.error('Error reading or parsing config:', error);
  process.exit(1);
}

app.use(express.json());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

function getOwnersFor(record) {
  const ownerIds = record.ownerIds || [];
  const owners = config.persons || [];

  return ownerIds
    .map(ownerId => owners.find(owner => owner.id === ownerId))
    .filter(Boolean);
}

function getPetsWithOwners() {
  const pets = config.pets || [];
  const ownersById = new Map((config.persons || []).map(o => [o.id, o]));

  return pets.map(pet => ({
    ...pet,
    owners: (pet.ownerIds || [])
      .map(id => ownersById.get(id))
      .filter(Boolean)
  }));
}

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

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

const shutdown = () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
