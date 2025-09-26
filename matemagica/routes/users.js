var express = require('express');
var router = express.Router();
const db = require('../db'); // Importa a configuração do banco de dados

/* GET: Listar todos os usuários. */
// Nenhuma alteração necessária aqui, o "SELECT *" já incluirá o novo campo 'type'.
router.get('/', async function(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuários.');
  }
});

/* GET: Buscar um usuário pelo ID. */
// Nenhuma alteração necessária aqui, o "SELECT *" já incluirá o novo campo 'type'.
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

/* POST: Registrar um novo usuário. */
// CORRIGIDO: O array de valores estava incompleto. Adicionei o 'type'.
router.post('/', async function(req, res, next) {
  const { username, email, password, type, classroom_id } = req.body; // Adicionado classroom_id
  try {
    // É altamente recomendável que você faça o hash da senha antes de salvar
    const result = await db.query(
      'INSERT INTO users (username, email, password, type, classroom_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [username, email, password, type, classroom_id] // Adicionado classroom_id
    );
    // Remove a senha do objeto de resposta por segurança
    delete result.rows[0].password;
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    // Adiciona uma verificação para erro de chave estrangeira
    if (err.code === '23503') { // Código de erro do PostgreSQL para violação de FK
        return res.status(400).json({ error: 'A classroom_id fornecida não existe.' });
    }
    res.status(500).send('Erro ao registrar novo usuário.');
  }
});

/* POST: Autenticar (login) um usuário. */
// MELHORADO: Retorna os dados do usuário (sem a senha) em caso de sucesso.
router.post('/login', async function(req, res, next) {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // ATENÇÃO: Esta comparação de senha não é segura! Use bcrypt.
            if (password === user.password) {
                // Em vez de uma mensagem simples, retorne os dados do usuário.
                // É crucial remover a senha do objeto antes de enviá-lo.
                delete user.password;
                res.json({ message: `Usuário ${username} autenticado com sucesso.`, user: user });
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

/* PUT: Atualizar um usuário existente pelo ID. */
// ATUALIZADO: Agora permite a atualização do campo 'type' e 'classroom_id'.
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { username, email, password, type, classroom_id } = req.body; // Adicionado 'type' e 'classroom_id'
  try {
    const result = await db.query(
      'UPDATE users SET username = $1, email = $2, password = $3, type = $4, classroom_id = $5 WHERE id = $6 RETURNING *',
      [username, email, password, type, classroom_id, id] // Adicionado 'type', 'classroom_id' e ajustado o índice do 'id'
    );
    if (result.rows.length > 0) {
      // Remove a senha do objeto de resposta por segurança
      delete result.rows[0].password;
      res.json(result.rows[0]);
    } else {
      res.status(404).send('Usuário não encontrado para atualização.');
    }
  } catch (err) {
    console.error(err);
    if (err.code === '23503') { // Código de erro do PostgreSQL para violação de FK
        return res.status(400).json({ error: 'A classroom_id fornecida não existe.' });
    }
    res.status(500).send('Erro ao atualizar usuário.');
  }
});

/* DELETE: Remover um usuário pelo ID. */
// Nenhuma alteração necessária aqui, a exclusão é baseada apenas no ID.
router.delete('/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.send(`Usuário ${result.rows[0].username} (ID: ${id}) foi removido.`);
        } else {
            res.status(404).send('Usuário não encontrado para exclusão.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao deletar usuário.');
    }
});

module.exports = router;