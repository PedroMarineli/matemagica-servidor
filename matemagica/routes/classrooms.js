const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Rota para criar uma nova sala de aula (apenas para professores)
router.post('/', authenticateToken, authorizeRole('teacher'), async (req, res) => {
    const { name, description } = req.body;
    const teacher_id = req.user.id; // ID do professor vem do token

    // Validação básica
    if (!name) {
        return res.status(400).json({ error: 'O nome da sala de aula é obrigatório.' });
    }

    try {
        const result = await db.query(
            'INSERT INTO classroom (name, description, teacher_id) VALUES ($1, $2, $3) RETURNING *',
            [name, description, teacher_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar a sala de aula.' });
    }
});

// Rota para obter todas as salas de aula (acessível a todos os usuários autenticados)
router.get('/', authenticateToken, async (req, res) => {
    const teacher_id = req.user.id;

    try {
        const result = await db.query('SELECT * FROM classroom WHERE teacher_id = $1',
            [teacher_id]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar as salas de aula.' });
    }
});

// Rota para obter uma sala de aula específica pelo ID (acessível a todos os usuários autenticados)
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM classroom WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sala de aula não encontrada.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar a sala de aula.' });
    }
});

// Rota para atualizar uma sala de aula (apenas para o professor responsável)
router.put('/:id', authenticateToken, authorizeRole('teacher'), async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const teacher_id = req.user.id;

    if (!name && !description) {
        return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
    }

    try {
        // Verifica se a sala de aula existe e se pertence ao professor que está fazendo a requisição
        const classroomCheck = await db.query('SELECT * FROM classroom WHERE id = $1 AND teacher_id = $2', [id, teacher_id]);
        if (classroomCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Sala de aula não encontrada ou você não tem permissão para atualizá-la.' });
        }

        const currentClassroom = classroomCheck.rows[0];
        const newName = name || currentClassroom.name;
        const newDescription = description || currentClassroom.description;

        const result = await db.query(
            'UPDATE classroom SET name = $1, description = $2 WHERE id = $3 RETURNING *',
            [newName, newDescription, id]
        );

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar a sala de aula.' });
    }
});

// Rota para deletar uma sala de aula (apenas para o professor responsável)
router.delete('/:id', authenticateToken, authorizeRole('teacher'), async (req, res) => {
    const { id } = req.params;
    try {
        // Opcional: Antes de deletar a sala, você pode querer desassociar todos os alunos.
        // A definição da FK com ON DELETE SET NULL já faz isso, mas se precisasse de lógica extra, seria aqui.
        // await db.query('UPDATE users SET classroom_id = NULL WHERE classroom_id = $1', [id]);

        const result = await db.query('DELETE FROM classroom WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Sala de aula não encontrada.' });
        }
        res.status(200).json({ message: 'Sala de aula deletada com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao deletar a sala de aula.' });
    }
});

module.exports = router;
