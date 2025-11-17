const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const progressService = require('../services/progressService');

// Rota para obter o progresso de todas as tarefas de um aluno específico (RF06)
router.get('/student/:student_id', authenticateToken, async (req, res) => {
    const { student_id } = req.params;
    const { status } = req.query; 
    
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

// Rota para obter o progresso de todos os alunos em uma tarefa específica
router.get('/task/:task_id', authenticateToken, authorizeRole('teacher'), async (req, res) => {
    const { task_id } = req.params;
    try {
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

// Rota para dashboard do professor (RF07)
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


// --- INÍCIO DA ROTA ADICIONADA ---
// Rota para atualizar o status de uma tarefa (ex: Not Started -> In Progress)
router.put('/update', authenticateToken, async (req, res) => {
    const { student_id, task_id, status, score } = req.body;
    const user_id = req.user.id;

    if (req.user.role === 'student' && user_id !== parseInt(student_id)) {
        return res.status(403).json({ error: 'Você não tem permissão para atualizar este recurso.' });
    }
    
    if (!student_id || !task_id || !status) {
         return res.status(400).json({ error: 'student_id, task_id e status são obrigatórios.' });
    }

    try {
        
        // --- INÍCIO DA CORREÇÃO ---
        // Trocamos o CASE por COALESCE.
        // COALESCE($2::numeric, score) significa: "Tente usar o parâmetro $2 (o score enviado).
        // Se $2 for NULL, use o valor que já está na coluna 'score'".
        
        const updateQuery = `
            UPDATE task_progress
            SET status = $1, 
                score = COALESCE($2::numeric, score)
            WHERE student_id = $3 AND task_id = $4
            RETURNING *`;
        // --- FIM DA CORREÇÃO ---

        const updateResult = await db.query(updateQuery, [status, score, student_id, task_id]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Registro de progresso não encontrado.' });
        }

        res.status(200).json(updateResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar o progresso da tarefa.' });
    }
});
// --- FIM DA ROTA ADICIONADA ---


// Rota para um aluno submeter uma tarefa (RF08)
router.post('/submit', authenticateToken, async (req, res) => {
    
    // --- INÍCIO DA CORREÇÃO ---
    // 1. Receber 'score' e 'number_of_attempts' do frontend
    const { task_id, answers, number_of_attempts, score } = req.body;
    const student_id = req.user.id;

    if (!task_id || answers === undefined || number_of_attempts === undefined || score === undefined) {
        return res.status(400).json({ error: 'Todos os campos (task_id, answers, number_of_attempts, score) são obrigatórios.' });
    }
    // --- FIM DA CORREÇÃO ---

    try {
        const progressCheck = await db.query(
            'SELECT * FROM task_progress WHERE student_id = $1 AND task_id = $2',
            [student_id, task_id]
        );

        if (progressCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tarefa não atribuída a este aluno.' });
        }

        // --- LÓGICA DE CORREÇÃO REMOVIDA ---
        // Não precisamos mais verificar as respostas no backend,
        // pois estamos a confiar na pontuação calculada pelo frontend.
        // --- FIM DA REMOÇÃO ---

        // --- INÍCIO DA CORREÇÃO ---
        // 2. Atualizar o banco de dados com os valores recebidos
        const updateResult = await db.query(
            `UPDATE task_progress 
             SET status = 'Submitted', 
                 answers = $1, 
                 score = $2, 
                 completion_date = NOW(), 
                 number_of_attempts = $3
             WHERE student_id = $4 AND task_id = $5
             RETURNING *`,
            [JSON.stringify(answers), score, number_of_attempts, student_id, task_id]
        );
        // --- FIM DA CORREÇÃO ---

        res.status(200).json(updateResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao submeter a tarefa.' });
    }
});

// ESTE É O ÚNICO EXPORT NO FINAL DO FICHEIRO
module.exports = router;