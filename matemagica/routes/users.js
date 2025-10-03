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
  const { username, email, password, type, classroom_id, photo_url, avatar_url } = req.body;
  try {
    // É altamente recomendável que você faça o hash da senha antes de salvar
    const result = await db.query(
      'INSERT INTO users (username, email, password, type, classroom_id, photo_url, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [username, email, password, type, classroom_id, photo_url, avatar_url]
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

/* POST: Registrar um novo professor (RF02). */
router.post('/register/teacher', async function(req, res, next) {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email e senha são obrigatórios.' });
  }
  
  try {
    // É altamente recomendável que você faça o hash da senha antes de salvar
    const result = await db.query(
      'INSERT INTO users (username, email, password, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, password, 'teacher']
    );
    // Remove a senha do objeto de resposta por segurança
    delete result.rows[0].password;
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Código de erro para violação de constraint UNIQUE
        return res.status(400).json({ error: 'Username ou email já existem.' });
    }
    res.status(500).send('Erro ao registrar novo professor.');
  }
});

/* POST: Registrar um novo aluno por um professor (RF03). */
router.post('/register/student', async function(req, res, next) {
  const { username, password, teacher_id, classroom_id, photo_url } = req.body;
  
  if (!username || !password || !teacher_id) {
    return res.status(400).json({ error: 'Username, senha e teacher_id são obrigatórios.' });
  }
  
  try {
    // Verifica se o teacher_id é válido e é um professor
    const teacherCheck = await db.query('SELECT id FROM users WHERE id = $1 AND type = $2', [teacher_id, 'teacher']);
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Professor não encontrado ou usuário não é um professor.' });
    }
    
    // Verifica se classroom_id existe, se fornecido
    if (classroom_id) {
      const classroomCheck = await db.query('SELECT id FROM classroom WHERE id = $1', [classroom_id]);
      if (classroomCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Sala de aula não encontrada.' });
      }
    }
    
    // Cria o aluno (RF08: photo_url é onde a foto enviada será armazenada)
    // avatar_url será preenchido quando o avatar for gerado
    const result = await db.query(
      'INSERT INTO users (username, password, type, classroom_id, photo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [username, password, 'student', classroom_id, photo_url]
    );
    
    // Remove a senha do objeto de resposta por segurança
    delete result.rows[0].password;
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
        return res.status(400).json({ error: 'Username já existe.' });
    }
    if (err.code === '23503') {
        return res.status(400).json({ error: 'A classroom_id fornecida não existe.' });
    }
    res.status(500).send('Erro ao registrar novo aluno.');
  }
});

/* POST: Autenticar (login) um usuário. */
// MELHORADO: Retorna os dados do usuário (sem a senha) em caso de sucesso.
// Agora aceita email OU username
router.post('/login', async function(req, res, next) {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;
    
    if (!loginIdentifier || !password) {
        return res.status(400).json({ error: 'Username/email e senha são obrigatórios.' });
    }
    
    try {
        // Busca por username OU email
        const result = await db.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1', 
            [loginIdentifier]
        );
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // ATENÇÃO: Esta comparação de senha não é segura! Use bcrypt.
            if (password === user.password) {
                // Em vez de uma mensagem simples, retorne os dados do usuário.
                // É crucial remover a senha do objeto antes de enviá-lo.
                delete user.password;
                res.json({ message: `Usuário ${user.username} autenticado com sucesso.`, user: user });
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
// ATUALIZADO: Agora permite a atualização de todos os campos, incluindo photo_url e avatar_url
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { username, email, password, type, classroom_id, photo_url, avatar_url } = req.body;
  
  try {
    // Busca o usuário atual para fazer update parcial
    const currentUser = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (currentUser.rows.length === 0) {
      return res.status(404).send('Usuário não encontrado para atualização.');
    }
    
    const user = currentUser.rows[0];
    const result = await db.query(
      'UPDATE users SET username = $1, email = $2, password = $3, type = $4, classroom_id = $5, photo_url = $6, avatar_url = $7 WHERE id = $8 RETURNING *',
      [
        username !== undefined ? username : user.username,
        email !== undefined ? email : user.email,
        password !== undefined ? password : user.password,
        type !== undefined ? type : user.type,
        classroom_id !== undefined ? classroom_id : user.classroom_id,
        photo_url !== undefined ? photo_url : user.photo_url,
        avatar_url !== undefined ? avatar_url : user.avatar_url,
        id
      ]
    );
    
    // Remove a senha do objeto de resposta por segurança
    delete result.rows[0].password;
    res.json(result.rows[0]);
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