# Exemplos de Uso da API Matemágica

Este documento contém exemplos práticos de como usar a API do Matemágica para cada requisito funcional.

## RF01: Efetuar Login

### Login com username
```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "professor_joao",
    "password": "senha123"
  }'
```

### Login com email
```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "professor@escola.com",
    "password": "senha123"
  }'
```

**Resposta de sucesso:**
```json
{
  "message": "Usuário professor_joao autenticado com sucesso.",
  "user": {
    "id": 1,
    "username": "professor_joao",
    "email": "professor@escola.com",
    "type": "teacher",
    "classroom_id": null
  }
}
```

## RF02: Manter Professor (Cadastro)

### Registrar um novo professor
```bash
curl -X POST http://localhost:3000/users/register/teacher \
  -H "Content-Type: application/json" \
  -d '{
    "username": "professor_maria",
    "email": "maria@escola.com",
    "password": "senha456"
  }'
```

**Resposta de sucesso:**
```json
{
  "id": 2,
  "username": "professor_maria",
  "email": "maria@escola.com",
  "type": "teacher",
  "classroom_id": null,
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

## RF03: Manter Aluno (Cadastro pelo Professor)

### Professor registra um novo aluno
```bash
curl -X POST http://localhost:3000/users/register/student \
  -H "Content-Type: application/json" \
  -d '{
    "username": "aluno_pedro",
    "password": "senhaAluno123",
    "teacher_id": 1,
    "classroom_id": 1,
    "photo_url": "https://storage.exemplo.com/fotos/aluno_pedro.jpg"
  }'
```

**Resposta de sucesso:**
```json
{
  "id": 10,
  "username": "aluno_pedro",
  "type": "student",
  "classroom_id": 1,
  "photo_url": "https://storage.exemplo.com/fotos/aluno_pedro.jpg",
  "avatar_url": null,
  "created_at": "2024-01-15T11:00:00.000Z"
}
```

### Atualizar avatar do aluno (após geração)
```bash
curl -X PUT http://localhost:3000/users/10 \
  -H "Content-Type: application/json" \
  -d '{
    "avatar_url": "https://storage.exemplo.com/avatares/aluno_pedro_avatar.png"
  }'
```

## RF04: Manter Salas

### Criar uma sala de aula
```bash
curl -X POST http://localhost:3000/classrooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "5º Ano A",
    "description": "Turma de matemática básica",
    "teacher_id": 1
  }'
```

### Listar todas as salas
```bash
curl http://localhost:3000/classrooms
```

### Obter uma sala específica
```bash
curl http://localhost:3000/classrooms/1
```

### Atualizar uma sala
```bash
curl -X PUT http://localhost:3000/classrooms/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "5º Ano A - Manhã",
    "description": "Turma de matemática básica - período matutino"
  }'
```

### Deletar uma sala
```bash
curl -X DELETE http://localhost:3000/classrooms/1
```

## RF05: Manter Tarefas

### Criar uma tarefa
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Exercícios de Adição",
    "type": "addition",
    "content": "Resolva os seguintes problemas de adição: 5+3, 10+7, 15+20",
    "difficulty": "easy",
    "classroom_id": 1,
    "teacher_id": 1
  }'
```

**Resposta:** A tarefa é criada e automaticamente atribuída a todos os alunos da sala.

### Listar tarefas de uma sala
```bash
curl http://localhost:3000/tasks?classroom_id=1
```

### Obter uma tarefa específica
```bash
curl http://localhost:3000/tasks/5
```

### Atualizar uma tarefa
```bash
curl -X PUT http://localhost:3000/tasks/5 \
  -H "Content-Type: application/json" \
  -d '{
    "difficulty": "medium",
    "content": "Resolva os seguintes problemas de adição: 15+23, 45+67, 89+101"
  }'
```

### Deletar uma tarefa
```bash
curl -X DELETE http://localhost:3000/tasks/5
```

## RF06: Efetuar Tarefas (Visualização pelo Aluno)

### Listar todas as tarefas do aluno
```bash
curl http://localhost:3000/progress/student/10
```

### Listar apenas tarefas pendentes
```bash
curl http://localhost:3000/progress/student/10?status=pending
```

### Listar apenas tarefas concluídas
```bash
curl http://localhost:3000/progress/student/10?status=completed
```

**Resposta de exemplo:**
```json
[
  {
    "task_id": 5,
    "title": "Exercícios de Adição",
    "type": "addition",
    "content": "Resolva os seguintes problemas...",
    "difficulty": "easy",
    "status": "Not Started",
    "score": null,
    "completion_date": null
  },
  {
    "task_id": 6,
    "title": "Multiplicação Básica",
    "type": "multiplication",
    "content": "Pratique tabuada...",
    "difficulty": "medium",
    "status": "Submitted",
    "score": 85,
    "completion_date": "2024-01-14T15:30:00.000Z"
  }
]
```

### Aluno atualiza o progresso de uma tarefa
```bash
curl -X PUT http://localhost:3000/progress/update \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 10,
    "task_id": 5,
    "status": "In Progress"
  }'
```

### Aluno submete uma tarefa concluída
```bash
curl -X PUT http://localhost:3000/progress/update \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 10,
    "task_id": 5,
    "status": "Submitted",
    "score": 90
  }'
```

## RF07: Acompanhar Desempenho (Dashboard do Professor)

### Obter dashboard completo do professor
```bash
curl http://localhost:3000/progress/teacher/1/dashboard
```

### Obter dashboard filtrado por sala
```bash
curl http://localhost:3000/progress/teacher/1/dashboard?classroom_id=1
```

**Resposta de exemplo:**
```json
{
  "statistics": {
    "total_students": 25,
    "total_classrooms": 2,
    "total_tasks": 10,
    "completed_tasks": 150,
    "pending_tasks": 100,
    "average_score": 82.45
  },
  "student_performance": [
    {
      "student_id": 10,
      "username": "aluno_pedro",
      "classroom_name": "5º Ano A",
      "total_tasks_assigned": 10,
      "tasks_completed": 8,
      "average_score": 88.75
    },
    {
      "student_id": 11,
      "username": "aluna_maria",
      "classroom_name": "5º Ano A",
      "total_tasks_assigned": 10,
      "tasks_completed": 10,
      "average_score": 95.20
    }
  ]
}
```

### Ver progresso de uma tarefa específica
```bash
curl http://localhost:3000/progress/task/5
```

**Resposta:**
```json
[
  {
    "student_id": 10,
    "username": "aluno_pedro",
    "email": "pedro@exemplo.com",
    "status": "Submitted",
    "score": 90,
    "completion_date": "2024-01-15T14:20:00.000Z"
  },
  {
    "student_id": 11,
    "username": "aluna_maria",
    "email": null,
    "status": "Graded",
    "score": 95,
    "completion_date": "2024-01-15T13:45:00.000Z"
  }
]
```

## RF08: Gerar Foto do Aluno (Avatar)

O sistema está preparado para armazenar fotos e avatares. O fluxo completo seria:

### 1. Cadastrar aluno com foto
```bash
curl -X POST http://localhost:3000/users/register/student \
  -H "Content-Type: application/json" \
  -d '{
    "username": "aluno_joao",
    "password": "senha123",
    "teacher_id": 1,
    "classroom_id": 1,
    "photo_url": "https://storage.exemplo.com/fotos/joao.jpg"
  }'
```

### 2. Sistema externo gera avatar (integração futura)
Nesta etapa, um serviço externo de IA ou processamento de imagem:
- Recebe a `photo_url`
- Gera um avatar/mascote estilizado
- Armazena o avatar em um servidor
- Retorna a URL do avatar gerado

### 3. Atualizar URL do avatar no perfil do aluno
```bash
curl -X PUT http://localhost:3000/users/12 \
  -H "Content-Type: application/json" \
  -d '{
    "avatar_url": "https://storage.exemplo.com/avatares/joao_avatar.png"
  }'
```

### 4. Obter perfil do aluno com avatar
```bash
curl http://localhost:3000/users/12
```

**Resposta:**
```json
{
  "id": 12,
  "username": "aluno_joao",
  "type": "student",
  "classroom_id": 1,
  "photo_url": "https://storage.exemplo.com/fotos/joao.jpg",
  "avatar_url": "https://storage.exemplo.com/avatares/joao_avatar.png",
  "created_at": "2024-01-15T12:00:00.000Z"
}
```

## Fluxo Completo de Uso

### Cenário: Professor cria turma e atribui tarefa

```bash
# 1. Professor faz login
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "prof_ana", "password": "senha123"}'

# 2. Professor cria uma sala
curl -X POST http://localhost:3000/classrooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "4º Ano B",
    "description": "Matemática intermediária",
    "teacher_id": 1
  }'

# 3. Professor cadastra alunos
curl -X POST http://localhost:3000/users/register/student \
  -H "Content-Type: application/json" \
  -d '{
    "username": "aluno_carlos",
    "password": "senha456",
    "teacher_id": 1,
    "classroom_id": 2,
    "photo_url": "https://..."
  }'

# 4. Professor cria uma tarefa
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Subtração Simples",
    "type": "subtraction",
    "content": "Resolva: 10-3, 20-8, 15-7",
    "difficulty": "easy",
    "classroom_id": 2,
    "teacher_id": 1
  }'

# 5. Aluno faz login e vê suas tarefas
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "aluno_carlos", "password": "senha456"}'

curl http://localhost:3000/progress/student/15?status=pending

# 6. Aluno realiza e submete a tarefa
curl -X PUT http://localhost:3000/progress/update \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 15,
    "task_id": 8,
    "status": "Submitted",
    "score": 100
  }'

# 7. Professor verifica o desempenho
curl http://localhost:3000/progress/teacher/1/dashboard?classroom_id=2
```

## Notas Importantes

1. **Segurança**: Em produção, implemente autenticação JWT e hash de senhas (bcrypt).
2. **Validação**: Sempre valide os dados no lado do servidor.
3. **CORS**: Configure CORS adequadamente se o frontend estiver em domínio diferente.
4. **Upload de Arquivos**: Para RF08, implemente upload de arquivos usando multer ou similar.
5. **Avatar Generation**: Integre com serviços como:
   - OpenAI DALL-E
   - Stable Diffusion
   - Ready Player Me
   - Ou qualquer API de geração de avatares
