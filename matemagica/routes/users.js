const { cartoonizeImage } = require('../services/cartoonizer');
var express = require('express');
var router = express.Router();
const db = require('../db'); // Importa a configuração do banco de dados
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const saltRounds = 10; // Fator de custo para o bcrypt

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { formatStudentPhotoUrl, PUBLIC_ROOT } = require('../utils/pathUtils');

// Configuração do Multer para upload de fotos de alunos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Usa o PUBLIC_ROOT para consistência
    cb(null, path.join('public', PUBLIC_ROOT));
  },
  filename: function (req, file, cb) {
    // Garante um nome de arquivo único para evitar sobrescrever
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, path.join(__dirname, '..', 'public', PUBLIC_ROOT));
  }
});

const upload = multer({ storage: storage });

// Função "fire-and-forget" para processar a imagem em segundo plano
async function processCartoonization(imageFilename, studentId) {
  console.log(`Iniciando cartoonização para o aluno ID: ${studentId}`);
  try {
    // Constrói o caminho completo para a imagem
    const fullImagePath = path.join(__dirname, '..', 'public', PUBLIC_ROOT, imageFilename);
    const cartoon_image_filename = await cartoonizeImage(fullImagePath);
    
    if (cartoon_image_filename) {
      // Salva apenas o nome do ficheiro na base de dados
      await db.query(
        'UPDATE users SET cartoon_image_path = $1 WHERE id = $2',
        [cartoon_image_filename, studentId]
      );
      console.log(`Imagem cartoonizada salva para o aluno ID: ${studentId}`);
    }
  } catch (error) {
    console.error(`Falha ao processar a imagem para o aluno ID: ${studentId}`, error);
  }
}

/* GET: Listar todos os usuários. (Apenas para professores) */
router.get('/', authenticateToken, authorizeRole('teacher'), async function(req, res, next) {
  try {
    const result = await db.query('SELECT id, username, email, type, classroom_id, photo_path, cartoon_image_path FROM users');
    // Adiciona o caminho completo da imagem para cada usuário
    const users = result.rows.map(user => {
      user.photo_path = formatStudentPhotoUrl(user.photo_path, req);
      user.cartoon_image_path = formatStudentPhotoUrl(user.cartoon_image_path, req);
      return user;
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuários.');
  }
});

/* GET: Buscar um usuário pelo ID. (Usuário pode buscar a si mesmo, professor pode buscar qualquer um) */
router.get('/:id', authenticateToken, async function(req, res, next) {
  const { id } = req.params;
  
  if (req.user.role !== 'teacher' && req.user.id !== parseInt(id)) {
    return res.status(403).send('Acesso negado.');
  }

  try {
    const result = await db.query('SELECT id, username, email, type, classroom_id, photo_path, cartoon_image_path FROM users WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      user.photo_path = formatStudentPhotoUrl(user.photo_path, req);
      user.cartoon_image_path = formatStudentPhotoUrl(user.cartoon_image_path, req);
      res.json(user);
    } else {
      res.status(404).send('Usuário não encontrado.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar usuário.');
  }
});

/* POST: Registrar um novo professor (RF02). (Público) */
router.post('/register/teacher', async function(req, res, next) {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email e senha são obrigatórios.' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const result = await db.query(
      'INSERT INTO users (username, email, password, type) VALUES ($1, $2, $3, $4) RETURNING id, username, email, type',
      [username, email, hashedPassword, 'teacher']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Código de erro para violação de constraint UNIQUE
        return res.status(400).json({ error: 'Username ou email já existem.' });
    }
    res.status(500).send('Erro ao registrar novo professor.');
  }
});

/* POST: Registrar um novo aluno por um professor (RF03). (Apenas professores) */
router.post('/register/student', authenticateToken, authorizeRole('teacher'), upload.single('photo'), async function(req, res, next) {
  const { username, password, classroom_id } = req.body;
  const teacher_id = req.user.id;
  const photo_filename = req.file ? req.file.filename : null;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username e senha são obrigatórios.' });
  }
  
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    if (classroom_id) {
      const classroomCheck = await client.query('SELECT id FROM classroom WHERE id = $1 AND teacher_id = $2', [classroom_id, teacher_id]);
      if (classroomCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Sala de aula não encontrada ou não pertence a este professor.' });
      }
    }
    
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await client.query(
      'INSERT INTO users (username, password, type, classroom_id, photo_path) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, type, classroom_id, photo_path',
      [username, hashedPassword, 'student', classroom_id, photo_filename]
    );
    
    const studentData = result.rows[0];
    
    await client.query('COMMIT');

    // Formata a URL da foto para a resposta
    studentData.photo_path = formatStudentPhotoUrl(studentData.photo_path, req);

    res.status(201).json(studentData); // Responde imediatamente

    // --- Processamento assíncrono da imagem ---
    if (photo_filename) {
      processCartoonization(photo_filename, studentData.id);
    }
    // -----------------------------------------

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') {
        return res.status(400).json({ error: 'Username já existe.' });
    }
    if (err.code === '23503') {
        return res.status(400).json({ error: 'A classroom_id fornecida não existe.' });
    }
    if (!res.headersSent) {
        res.status(500).send('Erro ao registrar novo aluno.');
    }
  } finally {
    client.release();
  }
});

/* POST: Autenticar (login) um usuário. */
router.post('/login', async function(req, res, next) {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;
    
    if (!loginIdentifier || !password) {
        return res.status(400).json({ error: 'Username/email e senha são obrigatórios.' });
    }
    
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1 OR email = $1', [loginIdentifier]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                const payload = { id: user.id, username: user.username, role: user.type };
                const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
                
                user.photo_path = formatStudentPhotoUrl(user.photo_path, req);
                user.cartoon_image_path = formatStudentPhotoUrl(user.cartoon_image_path, req);
                delete user.password;

                res.json({ token: token, user: user });
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
router.put('/:id', authenticateToken, upload.single('photo'), async (req, res, next) => {
  const { id } = req.params;
  let { username, email, password, type, classroom_id } = req.body;
  const photo_filename = req.file ? req.file.filename : undefined;

  if (req.user.role !== 'teacher' && req.user.id !== parseInt(id)) {
    return res.status(403).send('Acesso negado.');
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const currentUserResult = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    if (currentUserResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).send('Usuário não encontrado.');
    }
    const currentUser = currentUserResult.rows[0];

    if (req.user.role === 'teacher' && currentUser.type === 'student') {
        if (currentUser.classroom_id) {
            const studentClassroom = await client.query('SELECT teacher_id FROM classroom WHERE id = $1', [currentUser.classroom_id]);
            if(studentClassroom.rows.length === 0 || studentClassroom.rows[0].teacher_id !== req.user.id) {
                await client.query('ROLLBACK');
                return res.status(403).send('Você só pode editar alunos de suas próprias turmas.');
            }
        } else if (classroom_id) { // Se o aluno não tem turma, mas uma está sendo atribuída
             const newClassroom = await client.query('SELECT teacher_id FROM classroom WHERE id = $1', [classroom_id]);
             if(newClassroom.rows.length === 0 || newClassroom.rows[0].teacher_id !== req.user.id) {
                await client.query('ROLLBACK');
                return res.status(403).send('Você só pode atribuir alunos para suas próprias turmas.');
            }
        }
    }
    
    if (password) {
      password = await bcrypt.hash(password, saltRounds);
    }

    const fields = { username, email, password, type, classroom_id, photo_path: photo_filename };
    const updates = [];
    const values = [];
    let queryIndex = 1;

    for (const key in fields) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${queryIndex}`);
        values.push(fields[key]);
        queryIndex++;
      }
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).send('Nenhum campo para atualizar.');
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${queryIndex} RETURNING *`;

    const result = await client.query(query, values);
    await client.query('COMMIT');

    const updatedUser = result.rows[0];
    delete updatedUser.password;
      
    updatedUser.photo_path = formatStudentPhotoUrl(updatedUser.photo_path, req);
    updatedUser.cartoon_image_path = formatStudentPhotoUrl(updatedUser.cartoon_image_path, req);

    res.json(updatedUser);

    if (photo_filename) {
        processCartoonization(photo_filename, updatedUser.id);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') {
        return res.status(400).json({ error: 'Username ou email já em uso.' });
    }
     if (err.code === '23503') {
        return res.status(400).json({ error: 'A classroom_id fornecida não existe.' });
    }
    res.status(500).send('Erro ao atualizar usuário.');
  } finally {
    client.release();
  }
});

/* DELETE: Remover um usuário pelo ID. (Apenas professores) */
router.delete('/:id', authenticateToken, authorizeRole('teacher'), async (req, res, next) => {
    const { id } = req.params;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        // Opcional: Adicionar verificação se o professor só pode deletar seus próprios alunos
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length > 0) {
            await client.query('COMMIT');
            res.send(`Usuário ${result.rows[0].username} (ID: ${id}) foi removido.`);
        } else {
            await client.query('ROLLBACK');
            res.status(404).send('Usuário não encontrado para exclusão.');
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send('Erro ao deletar usuário.');
    } finally {
        client.release();
    }
});

module.exports = router;