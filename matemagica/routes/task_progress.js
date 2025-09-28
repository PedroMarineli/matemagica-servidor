const express = require('express');
const router = express.Router();
const db = require('../db');

// Rota para obter o progresso de todas as tarefas de um aluno específico
router.get('/student/:student_id', async (req, res) => {
    const { student_id } = req.params;
    try {
        // Junta task_progress com tasks para obter detalhes da tarefa
        const result = await db.query(
            `SELECT 
                tp.task_id, 
                t.title, 
                t.type, 
                tp.status, 
                tp.score, 
                tp.completion_date 
             FROM task_progress tp
             JOIN tasks t ON tp.task_id = t.id
             WHERE tp.student_id = $1`,
            [student_id]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar o progresso do aluno.' });
    }
});

// Rota para obter o progresso de todos os alunos em uma tarefa específica
router.get('/task/:task_id', async (req, res) => {
    const { task_id } = req.params;
    try {
        // Junta task_progress com users para obter detalhes do aluno
        const result = await db.query(
            `SELECT 
                tp.student_id, 
                u.username, 
                u.email, 
                tp.status, 
                tp.score, 
                tp.completion_date 
             FROM task_progress tp
             JOIN users u ON tp.student_id = u.id
             WHERE tp.task_id = $1`,
            [task_id]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar o progresso da tarefa.' });
    }
});

// Rota para um aluno submeter/atualizar o progresso em uma tarefa
router.put('/update', async (req, res) => {
    const { student_id, task_id, status, score } = req.body;

    if (!student_id || !task_id) {
        return res.status(400).json({ error: 'student_id e task_id são obrigatórios.' });
    }
    if (!status && score === undefined) {
        return res.status(400).json({ error: 'É necessário fornecer um status ou uma pontuação.' });
    }

    try {
        const progressCheck = await db.query(
            'SELECT * FROM task_progress WHERE student_id = $1 AND task_id = $2',
            [student_id, task_id]
        );

        if (progressCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Registro de progresso não encontrado. O aluno ou tarefa podem não existir ou não estarem associados.' });
        }

        const currentProgress = progressCheck.rows[0];
        const newStatus = status || currentProgress.status;
        // Permite que a pontuação seja 0
        const newScore = score !== undefined ? score : currentProgress.score;
        // Define a data de conclusão se o status for 'Submitted' ou 'Graded' e não houver uma data
        const newCompletionDate = (newStatus === 'Submitted' || newStatus === 'Graded') && !currentProgress.completion_date
            ? new Date()
            : currentProgress.completion_date;

        const result = await db.query(
            `UPDATE task_progress 
             SET status = $1, score = $2, completion_date = $3 
             WHERE student_id = $4 AND task_id = $5 
             RETURNING *`,
            [newStatus, newScore, newCompletionDate, student_id, task_id]
        );

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar o progresso da tarefa.' });
    }
});

module.exports = router;
