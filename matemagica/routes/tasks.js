const express = require('express');
const router = express.Router();
const db = require('../db');

// Rota para criar uma nova tarefa (RF05)
router.post('/', async (req, res) => {
    const { title, type, content, difficulty, classroom_id, teacher_id, answer } = req.body;

    if (!title || !type || !classroom_id || !teacher_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios: título, tipo, ID da sala e ID do professor.' });
    }

    try {
        // Validações (opcional, mas recomendado)
        const teacherCheck = await db.query('SELECT id FROM users WHERE id = $1 AND type = $2', [teacher_id, 'teacher']);
        if (teacherCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Professor não encontrado ou o usuário não é um professor.' });
        }

        const classroomCheck = await db.query('SELECT id FROM classroom WHERE id = $1', [classroom_id]);
        if (classroomCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Sala de aula não encontrada.' });
        }

        const result = await db.query(
            'INSERT INTO tasks (title, type, content, difficulty, classroom_id, teacher_id, answer) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, type, content, difficulty, classroom_id, teacher_id, answer]
        );

        // Opcional: Automaticamente criar entradas 'task_progress' para todos os alunos da turma
        const students = await db.query('SELECT id FROM users WHERE classroom_id = $1 AND type = $2', [classroom_id, 'student']);
        const newTaskId = result.rows[0].id;

        for (const student of students.rows) {
            await db.query(
                'INSERT INTO task_progress (student_id, task_id) VALUES ($1, $2)',
                [student.id, newTaskId]
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar a tarefa.' });
    }
});

// Rota para obter todas as tarefas (pode ser filtrado por classroom_id)
router.get('/', async (req, res) => {
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

// Rota para obter uma tarefa específica pelo ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar a tarefa.' });
    }
});

// Rota para atualizar uma tarefa (RF05)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, type, content, difficulty, answer } = req.body;

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
        const newContent = content !== undefined ? content : currentTask.content;
        const newDifficulty = difficulty !== undefined ? difficulty : currentTask.difficulty;
        const newAnswer = answer !== undefined ? answer : currentTask.answer;

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
