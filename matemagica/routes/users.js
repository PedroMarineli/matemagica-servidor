var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/register', function(req, res, next) {
  // Lógica para registrar un nuevo usuario
  const { username, password } = req.body;
  // Aquí iría la lógica para guardar el usuario en la base de datos
  res.status(201).send(`Usuario ${username} registrado con éxito.`);
});

router.post('/login', function(req, res, next) {
  // Lógica para autenticar a un usuario
  const { username, password } = req.body;
  // Aquí iría la lógica para verificar las credenciales del usuario
  res.send(`Usuario ${username} autenticado con éxito.`);
});

module.exports = router;
