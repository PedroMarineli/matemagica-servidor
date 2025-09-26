const express = require('express');
const router = express.Router();
const db = require('../db');

// Rota para criar uma nova sala de aula
router.post('/', async (req, res) => {
    const { name, description, teacher_id } = req.body;

    // Validação básica
    if (!name || !teacher_id) {
        return res.status(400).json({ error: 'Nome e ID do professor são obrigatórios.' });
    }

    try {
        // Verifica se o professor (usuário) existe e é um professor
        const teacherCheck = await db.query('SELECT * FROM users WHERE id = $1 AND type = $2', [teacher_id, 'teacher']);
        if (teacherCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Professor não encontrado ou o usuário não é um professor.' });
        }

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

// Rota para obter todas as salas de aula
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM classroom');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar as salas de aula.' });
    }
});

// Rota para obter uma sala de aula específica pelo ID
router.get('/:id', async (req, res) => {
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

// Rota para atualizar uma sala de aula
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, teacher_id } = req.body;

    if (!name && !description && !teacher_id) {
        return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
    }

    try {
        // Verifica se a sala de aula existe
        const classroomCheck = await db.query('SELECT * FROM classroom WHERE id = $1', [id]);
        if (classroomCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Sala de aula não encontrada.' });
        }

        // Se o teacher_id for fornecido, verifica se o professor existe e é do tipo 'teacher'
        if (teacher_id) {
            const teacherCheck = await db.query('SELECT * FROM users WHERE id = $1 AND type = $2', [teacher_id, 'teacher']);
            if (teacherCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Professor não encontrado ou o usuário não é um professor.' });
            }
        }

        const currentClassroom = classroomCheck.rows[0];
        const newName = name || currentClassroom.name;
        const newDescription = description || currentClassroom.description;
        const newTeacherId = teacher_id || currentClassroom.teacher_id;

        const result = await db.query(
            'UPDATE classroom SET name = $1, description = $2, teacher_id = $3 WHERE id = $4 RETURNING *',
            [newName, newDescription, newTeacherId, id]
        );

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar a sala de aula.' });
    }
});

// Rota para deletar uma sala de aula
router.delete('/:id', async (req, res) => {
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
