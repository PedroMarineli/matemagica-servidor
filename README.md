# Matemágica Servidor

Este é o servidor backend para o projeto Matemágica, um jogo educacional focado em matemática. O servidor é construído com Node.js e Express, e utiliza PostgreSQL como banco de dados.

## Funcionalidades

-   **RF01**: Login de professores e alunos com email ou username
-   **RF02**: Cadastro de professores
-   **RF03**: Cadastro de alunos pelo professor (com suporte para foto)
-   **RF04**: Gerenciamento de salas de aula
-   **RF05**: Criação e gerenciamento de tarefas (com tipo, conteúdo e dificuldade)
-   **RF06**: Visualização de tarefas pelos alunos (pendentes e concluídas)
-   **RF07**: Dashboard de desempenho para professores
-   **RF08**: Suporte para foto do aluno e geração de avatar (API preparada para integração com serviço de geração de avatares)

### Nota sobre RF08 (Geração de Avatar)

O servidor está preparado para receber e armazenar:
- `photo_url`: URL da foto original do aluno
- `avatar_url`: URL do avatar gerado

A geração do avatar/mascote deve ser implementada através de um serviço externo (como IA generativa ou processamento de imagem). O fluxo sugerido é:

1. Professor envia foto do aluno ao cadastrá-lo (POST /users/register/student)
2. Sistema armazena `photo_url` no banco
3. Serviço externo processa a foto e gera o avatar
4. Avatar gerado é armazenado e a URL é atualizada via PUT /users/:id com o campo `avatar_url`

## Pré-requisitos

-   [Node.js](https://nodejs.org/) (versão 14 ou superior)
-   [NPM](https://www.npmjs.com/)
-   [PostgreSQL](https://www.postgresql.org/)

## Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/PedroMarineli/matemagica-servidor.git
    ```

2.  Navegue até o diretório do projeto:
    ```bash
    cd matemagica-servidor/matemagica
    ```

3.  Instale as dependências:
    ```bash
    npm install
    ```

4.  Configure o banco de dados. Crie um arquivo `db.js` na pasta `matemagica` (se não existir) e configure a conexão com seu banco de dados PostgreSQL.

5.  Execute o script de migração para adicionar os campos necessários:
    ```bash
    psql -U postgres -d matemagica-bd -f matemagica/migrations/add_missing_fields.sql
    ```

## Esquema do Banco de Dados

Para que todas as funcionalidades funcionem corretamente, certifique-se de que o banco de dados possui as seguintes colunas:

### Tabela `users`
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR UNIQUE NOT NULL)
- email (VARCHAR UNIQUE)
- password (VARCHAR NOT NULL)
- type (VARCHAR NOT NULL) -- 'teacher' ou 'student'
- classroom_id (INTEGER REFERENCES classroom(id))
- photo_url (TEXT) -- URL da foto original do aluno (RF08)
- avatar_url (TEXT) -- URL do avatar gerado (RF08)
- created_at (TIMESTAMP DEFAULT NOW())
```

### Tabela `classroom`
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR NOT NULL)
- description (TEXT)
- teacher_id (INTEGER REFERENCES users(id) NOT NULL)
- created_at (TIMESTAMP DEFAULT NOW())
```

### Tabela `tasks`
```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR NOT NULL)
- type (VARCHAR NOT NULL)
- content (TEXT) -- Conteúdo/descrição da tarefa (RF05)
- difficulty (VARCHAR) -- 'easy', 'medium', 'hard' (RF05)
- classroom_id (INTEGER REFERENCES classroom(id) NOT NULL)
- teacher_id (INTEGER REFERENCES users(id) NOT NULL)
- created_at (TIMESTAMP DEFAULT NOW())
```

### Tabela `task_progress`
```sql
- id (SERIAL PRIMARY KEY)
- student_id (INTEGER REFERENCES users(id) NOT NULL)
- task_id (INTEGER REFERENCES tasks(id) NOT NULL)
- status (VARCHAR DEFAULT 'Not Started') -- 'Not Started', 'In Progress', 'Submitted', 'Graded'
- score (DECIMAL)
- completion_date (TIMESTAMP)
- created_at (TIMESTAMP DEFAULT NOW())
- UNIQUE(student_id, task_id)
```

## Como Rodar

Para iniciar o servidor, execute o seguinte comando no diretório `matemagica`:

```bash
npm start
```

O servidor estará rodando em `http://localhost:3000`.

## Endpoints da API

A seguir estão os endpoints disponíveis organizados por funcionalidade.

### Usuários (`/users`)

-   **GET /**: Lista todos os usuários.
-   **GET /:id**: Obtém um usuário específico pelo seu ID.
-   **POST /**: Registra um novo usuário (genérico).
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "username": "seu_usuario",
          "email": "seu_email@exemplo.com",
          "password": "sua_senha",
          "type": "student|teacher",
          "classroom_id": 1,
          "photo_url": "https://...",
          "avatar_url": "https://..."
        }
        ```
-   **POST /register/teacher**: Registra um novo professor (RF02).
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "username": "professor_usuario",
          "email": "professor@exemplo.com",
          "password": "senha123"
        }
        ```
-   **POST /register/student**: Professor registra um novo aluno (RF03).
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "username": "aluno_usuario",
          "password": "senha123",
          "teacher_id": 1,
          "classroom_id": 1,
          "photo_url": "https://..."
        }
        ```
-   **POST /login**: Autentica um usuário com email ou username (RF01).
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "username": "seu_usuario",
          "password": "sua_senha"
        }
        ```
        ou
        ```json
        {
          "email": "seu_email@exemplo.com",
          "password": "sua_senha"
        }
        ```
-   **PUT /:id**: Atualiza as informações de um usuário.
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "username": "novo_usuario",
          "email": "novo_email@exemplo.com",
          "password": "nova_senha",
          "avatar_url": "https://..."
        }
        ```
-   **DELETE /:id**: Remove um usuário.

### Salas de Aula (`/classrooms`) - RF04

-   **POST /**: Cria uma nova sala de aula.
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "name": "Turma 5A",
          "description": "Matemática básica",
          "teacher_id": 1
        }
        ```
-   **GET /**: Lista todas as salas de aula.
-   **GET /:id**: Obtém uma sala específica pelo ID.
-   **PUT /:id**: Atualiza uma sala de aula.
-   **DELETE /:id**: Remove uma sala de aula.

### Tarefas (`/tasks`) - RF05

-   **POST /**: Cria uma nova tarefa.
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "title": "Adição básica",
          "type": "addition",
          "content": "Resolva os problemas de adição",
          "difficulty": "easy|medium|hard",
          "classroom_id": 1,
          "teacher_id": 1
        }
        ```
-   **GET /**: Lista todas as tarefas (pode filtrar por `?classroom_id=1`).
-   **GET /:id**: Obtém uma tarefa específica pelo ID.
-   **PUT /:id**: Atualiza uma tarefa.
-   **DELETE /:id**: Remove uma tarefa.

### Progresso de Tarefas (`/progress`) - RF06 e RF07

-   **GET /student/:student_id**: Lista tarefas do aluno (RF06).
    -   Query params opcionais: `?status=pending` ou `?status=completed`
-   **GET /task/:task_id**: Lista progresso de todos os alunos em uma tarefa.
-   **GET /teacher/:teacher_id/dashboard**: Dashboard do professor com estatísticas (RF07).
    -   Query params opcionais: `?classroom_id=1` para filtrar por sala
    -   Retorna:
        - Estatísticas gerais (total de alunos, salas, tarefas, média de pontuação)
        - Desempenho por aluno
-   **PUT /update**: Atualiza o progresso de um aluno em uma tarefa.
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "student_id": 1,
          "task_id": 1,
          "status": "In Progress|Submitted|Graded",
          "score": 85
        }
        ```
