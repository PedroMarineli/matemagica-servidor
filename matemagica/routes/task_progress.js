const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const progressService = require('../services/progressService');

// Rota para obter o progresso de todas as tarefas de um aluno específico (RF06) - Apenas o próprio aluno pode ver
router.get('/student/:student_id', authenticateToken, async (req, res) => {
    const { student_id } = req.params;
    const { status } = req.query; // Permite filtrar por status (pending/completed)
    
    // Garante que o usuário autenticado só possa acessar seu próprio progresso
    if (req.user.id !== parseInt(student_id) && req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Você não tem permissão para acessar este recurso.' });
    }

    try {
        let query = `SELECT 
                tp.task_id, 
                t.title, 
                t.type, 
                t.content,
                t.difficulty,
                tp.status, 
                tp.score, 
                tp.completion_date,
                tp.number_of_attempts
             FROM task_progress tp
             JOIN tasks t ON tp.task_id = t.id
             WHERE tp.student_id = $1`;
        
        const params = [student_id];
        
        // RF06: Filtrar tarefas pendentes ou concluídas
        if (status === 'pending') {
            query += ` AND tp.status IN ('Not Started', 'In Progress')`;
        } else if (status === 'completed') {
            query += ` AND tp.status IN ('Submitted', 'Graded')`;
        }
        
        query += ' ORDER BY t.created_at DESC';
        
        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar o progresso do aluno.' });
    }
});

// Rota para obter o progresso de todos os alunos em uma tarefa específica - Apenas para professores
router.get('/task/:task_id', authenticateToken, authorizeRole('teacher'), async (req, res) => {
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

// Rota para dashboard do professor - estatísticas de desempenho (RF07) - Apenas para professores
router.get('/teacher/dashboard', authenticateToken, authorizeRole('teacher'), async (req, res) => {
    const teacher_id = req.user.id;
    const { classroom_id } = req.query;
    
    try {
        const dashboardData = await progressService.getTeacherDashboard(teacher_id, classroom_id);
        res.status(200).json(dashboardData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar os dados do dashboard.' });
    }
});

// Rota para um aluno submeter uma tarefa (RF08)
router.post('/submit', authenticateToken, async (req, res) => {
    const { task_id, answers } = req.body;
    const student_id = req.user.id;

    if (!task_id || answers === undefined) {
        return res.status(400).json({ error: 'ID da tarefa e respostas são obrigatórios.' });
    }

    try {
        // Verifica se o progresso da tarefa existe para este aluno
        const progressCheck = await db.query(
            'SELECT * FROM task_progress WHERE student_id = $1 AND task_id = $2',
            [student_id, task_id]
        );

        if (progressCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não atribuída a este aluno.' });
        }

        // Busca a tarefa para obter a resposta correta
        const taskResult = await db.query('SELECT answer, type FROM tasks WHERE id = $1', [task_id]);
        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }

        const correctAnswer = taskResult.rows[0].answer;
        const taskType = taskResult.rows[0].type;
        let score = 0;

        // Lógica de correção automática
        if (taskType === 'multiple_choice' || taskType === 'fill_in_the_blanks') {
            const correct = JSON.parse(correctAnswer);
            const submitted = Array.isArray(answers) ? answers : [answers];
            let correctCount = 0;
            for (let i = 0; i < correct.length; i++) {
                if (String(correct[i]).toLowerCase() === String(submitted[i]).toLowerCase()) {
                    correctCount++;
                }
            }
            score = (correctCount / correct.length) * 100;
        } else {
            // Para tipos de resposta aberta, a pontuação pode ser definida manualmente mais tarde
            score = null; // ou 0, dependendo da regra de negócio
        }

        // Atualiza o progresso da tarefa
        const updateResult = await db.query(
            `UPDATE task_progress 
             SET status = 'Submitted', 
                 answers = $1, 
                 score = $2, 
                 completion_date = NOW(), 
                 number_of_attempts = number_of_attempts + 1
             WHERE student_id = $3 AND task_id = $4
             RETURNING *`,
            [JSON.stringify(answers), score, student_id, task_id]
        );

        res.status(200).json(updateResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao submeter a tarefa.' });
    }
});

module.exports = router;

// Rota para obter o progresso de todos os alunos em uma tarefa específica - Apenas para professores
router.get('/task/:task_id', authenticateToken, authorizeRole('teacher'), async (req, res) => {
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

// Rota para dashboard do professor - estatísticas de desempenho (RF07) - Apenas para professores
router.get('/teacher/dashboard', authenticateToken, authorizeRole('teacher'), async (req, res) => {
    const teacher_id = req.user.id;
    const { classroom_id } = req.query;
    
    try {
        const dashboardData = await progressService.getTeacherDashboard(teacher_id, classroom_id);
        res.status(200).json(dashboardData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar os dados do dashboard.' });
    }
});

// Rota para um aluno submeter uma tarefa (RF08)
router.post('/submit', authenticateToken, async (req, res) => {
    const { task_id, answers } = req.body;
    const student_id = req.user.id;

    if (!task_id || answers === undefined) {
        return res.status(400).json({ error: 'ID da tarefa e respostas são obrigatórios.' });
    }

    try {
        // Verifica se o progresso da tarefa existe para este aluno
        const progressCheck = await db.query(
            'SELECT * FROM task_progress WHERE student_id = $1 AND task_id = $2',
            [student_id, task_id]
        );

        if (progressCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não atribuída a este aluno.' });
        }

        // Busca a tarefa para obter a resposta correta
        const taskResult = await db.query('SELECT answer, type FROM tasks WHERE id = $1', [task_id]);
        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não encontrada.' });
        }

        const correctAnswer = taskResult.rows[0].answer;
        const taskType = taskResult.rows[0].type;
        let score = 0;

        // Lógica de correção automática
        if (taskType === 'multiple_choice' || taskType === 'fill_in_the_blanks') {
            const correct = JSON.parse(correctAnswer);
            const submitted = Array.isArray(answers) ? answers : [answers];
            let correctCount = 0;
            for (let i = 0; i < correct.length; i++) {
                if (String(correct[i]).toLowerCase() === String(submitted[i]).toLowerCase()) {
                    correctCount++;
                }
            }
            score = (correctCount / correct.length) * 100;
        } else {
            // Para tipos de resposta aberta, a pontuação pode ser definida manualmente mais tarde
            score = null; // ou 0, dependendo da regra de negócio
        }

        // Atualiza o progresso da tarefa
        const updateResult = await db.query(
            `UPDATE task_progress 
             SET status = 'Submitted', 
                 answers = $1, 
                 score = $2, 
                 completion_date = NOW(), 
                 number_of_attempts = number_of_attempts + 1
             WHERE student_id = $3 AND task_id = $4
             RETURNING *`,
            [JSON.stringify(answers), score, student_id, task_id]
        );

        res.status(200).json(updateResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao submeter a tarefa.' });
    }
});

module.exports = router;