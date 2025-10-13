const express = require('express');
const router = express.Router();
const db = require('../db');

// Rota para obter o progresso de todas as tarefas de um aluno específico (RF06)
router.get('/student/:student_id', async (req, res) => {
    const { student_id } = req.params;
    const { status } = req.query; // Permite filtrar por status (pending/completed)
    
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

// Rota para dashboard do professor - estatísticas de desempenho (RF07)
router.get('/teacher/:teacher_id/dashboard', async (req, res) => {
    const { teacher_id } = req.params;
    const { classroom_id } = req.query;
    
    try {
        // Verifica se o professor existe
        const teacherCheck = await db.query('SELECT id FROM users WHERE id = $1 AND type = $2', [teacher_id, 'teacher']);
        if (teacherCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Professor não encontrado.' });
        }
        
        // Query base para estatísticas
        let classroomFilter = '';
        let params = [teacher_id];
        
        if (classroom_id) {
            classroomFilter = ' AND c.id = $2';
            params.push(classroom_id);
        }
        
        // Estatísticas gerais
        const stats = await db.query(
            `SELECT 
                COUNT(DISTINCT u.id) as total_students,
                COUNT(DISTINCT c.id) as total_classrooms,
                COUNT(DISTINCT t.id) as total_tasks,
                COUNT(CASE WHEN tp.status IN ('Submitted', 'Graded') THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN tp.status IN ('Not Started', 'In Progress') THEN 1 END) as pending_tasks,
                ROUND(AVG(CASE WHEN tp.score IS NOT NULL THEN tp.score END), 2) as average_score
             FROM classroom c
             LEFT JOIN users u ON u.classroom_id = c.id AND u.type = 'student'
             LEFT JOIN tasks t ON t.classroom_id = c.id
             LEFT JOIN task_progress tp ON tp.student_id = u.id AND tp.task_id = t.id
             WHERE c.teacher_id = $1${classroomFilter}`,
            params
        );
        
        // Desempenho por aluno
        const studentPerformance = await db.query(
            `SELECT 
                u.id as student_id,
                u.username,
                c.name as classroom_name,
                COUNT(tp.task_id) as total_tasks_assigned,
                COUNT(CASE WHEN tp.status IN ('Submitted', 'Graded') THEN 1 END) as tasks_completed,
                ROUND(AVG(CASE WHEN tp.score IS NOT NULL THEN tp.score END), 2) as average_score
             FROM classroom c
             JOIN users u ON u.classroom_id = c.id AND u.type = 'student'
             LEFT JOIN task_progress tp ON tp.student_id = u.id
             WHERE c.teacher_id = $1${classroomFilter}
             GROUP BY u.id, u.username, c.name
             ORDER BY average_score DESC NULLS LAST`,
            params
        );
        
        res.status(200).json({
            statistics: stats.rows[0],
            student_performance: studentPerformance.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar dashboard do professor.' });
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
