-- Migration para adicionar campos necessários para atender aos requisitos funcionais
-- Execute este script no seu banco de dados PostgreSQL

-- Adicionar campos photo_url e avatar_url à tabela users (RF08)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Adicionar campos content e difficulty à tabela tasks (RF05)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS answer TEXT;

-- Adicionar campo para número de tentativas em task_progress (RF06)
ALTER TABLE task_progress ADD COLUMN IF NOT EXISTS number_of_attempts INTEGER DEFAULT 0;

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_users_classroom_id ON users(classroom_id);
CREATE INDEX IF NOT EXISTS idx_tasks_classroom_id ON tasks(classroom_id);
CREATE INDEX IF NOT EXISTS idx_tasks_teacher_id ON tasks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_student_id ON task_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_task_id ON task_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_status ON task_progress(status);

-- Adicionar comentários para documentação
COMMENT ON COLUMN users.photo_url IS 'URL da foto original do aluno enviada pelo professor (RF03, RF08)';
COMMENT ON COLUMN users.avatar_url IS 'URL do avatar/mascote gerado a partir da foto do aluno (RF08)';
COMMENT ON COLUMN tasks.content IS 'Conteúdo/descrição detalhada da tarefa, pode ser um JSON para uma lista de problemas (RF05)';
COMMENT ON COLUMN tasks.difficulty IS 'Nível de dificuldade da tarefa: easy, medium, hard (RF05)';
COMMENT ON COLUMN tasks.answer IS 'Resposta correta para a tarefa, pode ser um JSON para múltiplas respostas (RF05)';
COMMENT ON COLUMN task_progress.number_of_attempts IS 'Número de tentativas que o aluno fez para completar a tarefa (RF06)';
