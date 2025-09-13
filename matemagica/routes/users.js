var express = require('express');
var router = express.Router();
const db = require('../db'); // Importa a configuração do banco de dados

/* GET users listing. */
router.get('/', async function(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuários.');
  }
});

/* GET user by id. */
router.get('/:id', async function(req, res, next) {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('Usuário não encontrado.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuário.');
  }
});


router.post('/register', async function(req, res, next) {
  const { username, email, password } = req.body;
  try {
    // É altamente recomendável que você faça o hash da senha antes de salvar
    const result = await db.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, password]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao registrar novo usuário.');
  }
});

router.post('/login', async function(req, res, next) {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Aqui você deve comparar a senha enviada com a senha armazenada (de preferência, o hash dela)
            if (password === user.password) { // Simplificado: substitua por uma comparação de hash
                res.send(`Usuário ${username} autenticado com sucesso.`);
            } else {
                res.status(401).send('Credenciais inválidas.');
            }
        } else {
            res.status(404).send('Usuário não encontrado.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao tentar fazer login.');
    }
});

/* PUT para atualizar um usuário */
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { username, email, password } = req.body;
  try {
    const result = await db.query(
      'UPDATE users SET username = $1, email = $2, password = $3 WHERE id = $4 RETURNING *',
      [username, email, password, id]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('Usuário não encontrado para atualização.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao atualizar usuário.');
  }
});

/* DELETE para remover um usuário */
router.delete('/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.send(`Usuário com id ${id} foi removido.`);
        } else {
            res.status(404).send('Usuário não encontrado para exclusão.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao deletar usuário.');
    }
});


module.exports = router;