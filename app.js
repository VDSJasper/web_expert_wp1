const express = require('express');
const { saveConfig, config } = require('./config');
const petsRouter = require('./routes/pets');
const { getOwnersFor, getPetsWithOwners } = require('./lib/owners');
const {join} = require("node:path");

const app = express();
app.use(express.json());
app.use('/pets', petsRouter);

app.set("views", join(__dirname, "views"));
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
  const allRoutes = [];
  const allRouteNames = [];

  for (let route of config.routes) {
    allRoutes.push(config[route]);
    allRouteNames.push(route);
  }

  res.render("index", {
    title: `${allRouteNames[0]} and ${allRouteNames[1]}`,
    routeNames: allRouteNames,
    routes: allRoutes,
    relationships: config.relationships,
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

  const record = data.find(item => String(item.id) === String(id));

  console.log(record);

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

function start(port = 3000) {
  const server = app.listen(port, () => console.log(`Listening on port ${port}`));
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

  return server;
}

if (require.main === module) {
  start();
}

module.exports = app;
