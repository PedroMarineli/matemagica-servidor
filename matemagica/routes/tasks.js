const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Rota para criar uma nova tarefa (RF05) - Apenas para professores
router.post('/', authenticateToken, authorizeRole('teacher'), async (req, res) => {
    let { title, type, content, difficulty, classroom_id, answer } = req.body;
    const teacher_id = req.user.id; // ID do professor vem do token

    if (!title || !type || !classroom_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios: título, tipo e ID da sala.' });
    }

    const client = await db.connect(); // Pega um cliente do pool

    try {
        await client.query('BEGIN'); // Inicia a transação

        // Validações
        const classroomCheck = await client.query('SELECT id FROM classroom WHERE id = $1 AND teacher_id = $2', [classroom_id, teacher_id]);
        if (classroomCheck.rows.length === 0) {
            throw new Error('Sala de aula não encontrada ou não pertence a este professor.');
        }

        // Garante que o conteúdo e a resposta sejam armazenados como JSON se forem arrays
        if (Array.isArray(content)) {
            content = JSON.stringify(content);
        }
        if (Array.isArray(answer)) {
            answer = JSON.stringify(answer);
        }

        const taskResult = await client.query(
            'INSERT INTO tasks (title, type, content, difficulty, classroom_id, teacher_id, answer) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, type, content, difficulty, classroom_id, teacher_id, answer]
        );
        const newTaskId = taskResult.rows[0].id;

        // Automaticamente criar entradas 'task_progress' para todos os alunos da turma
        const students = await client.query('SELECT id FROM users WHERE classroom_id = $1 AND type = $2', [classroom_id, 'student']);
        
        for (const student of students.rows) {
            await client.query(
                'INSERT INTO task_progress (student_id, task_id) VALUES ($1, $2)',
                [student.id, newTaskId]
            );
        }

        await client.query('COMMIT'); // Confirma a transação
        res.status(201).json(taskResult.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK'); // Desfaz a transação em caso de erro
        console.error(err);
        if (err.message.includes('Sala de aula não encontrada')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Erro ao criar a tarefa.' });
    } finally {
        client.release(); // Libera o cliente de volta para o pool
    }
});

// Rota para obter todas as tarefas (pode ser filtrado por classroom_id) - Acessível a todos os usuários autenticados
router.get('/', authenticateToken, async (req, res) => {
    const { classroom_id } = req.query;
    try {
        let query = 'SELECT * FROM tasks';
        const params = [];
        if (classroom_id) {
            query += ' WHERE classroom_id = $1';
            params.push(classroom_id);
        }
        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar as tarefas.' });
    }
});

// Rota para obter uma tarefa específica pelo ID - Acessível a todos os usuários autenticados
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }
        
        const task = result.rows[0];

        // Analisa o campo de conteúdo para converter a string JSON em um objeto
        if (task.content && typeof task.content === 'string') {
            try {
                task.problems = JSON.parse(task.content);
                delete task.content; // Remove o campo original para evitar redundância
            } catch (e) {
                console.error("Erro ao analisar o conteúdo da tarefa:", e);
                // Opcional: decidir como lidar com JSON inválido. 
                // Por enquanto, apenas registra o erro e envia como está.
            }
        }

        res.status(200).json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar a tarefa.' });
    }
});

// Rota para atualizar uma tarefa (RF05)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    let { title, type, content, difficulty, answer } = req.body;

    if (!title && !type && !content && !difficulty && !answer) {
        return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
    }

    try {
        const taskCheck = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (taskCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }

        const currentTask = taskCheck.rows[0];
        const newTitle = title !== undefined ? title : currentTask.title;
        const newType = type !== undefined ? type : currentTask.type;
        let newContent = content !== undefined ? content : currentTask.content;
        const newDifficulty = difficulty !== undefined ? difficulty : currentTask.difficulty;
        let newAnswer = answer !== undefined ? answer : currentTask.answer;

        // Garante que o conteúdo e a resposta sejam armazenados como JSON se forem arrays
        if (Array.isArray(newContent)) {
            newContent = JSON.stringify(newContent);
        }
        if (Array.isArray(newAnswer)) {
            newAnswer = JSON.stringify(newAnswer);
        }

        const result = await db.query(
            'UPDATE tasks SET title = $1, type = $2, content = $3, difficulty = $4, answer = $5 WHERE id = $6 RETURNING *',
            [newTitle, newType, newContent, newDifficulty, newAnswer, id]
        );

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar a tarefa.' });
    }
});

// Rota para deletar uma tarefa
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // ON DELETE CASCADE na FK irá remover os registros de task_progress automaticamente
        const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }
        res.status(200).json({ message: 'Tarefa deletada com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao deletar a tarefa.' });
    }
});

module.exports = router;
