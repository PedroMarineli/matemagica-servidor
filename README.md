# Matemágica Servidor

Este é o servidor backend para o projeto Matemágica, um jogo educacional focado em matemática. O servidor é construído com Node.js e Express, e utiliza PostgreSQL como banco de dados.

## Funcionalidades

-   Gerenciamento de usuários (cadastro, login, atualização e exclusão).
-   API RESTful para interagir com o frontend do jogo.

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

## Como Rodar

Para iniciar o servidor, execute o seguinte comando no diretório `matemagica`:

```bash
npm start
```

O servidor estará rodando em `http://localhost:3000`.

## Endpoints da API

A seguir estão os endpoints disponíveis para o gerenciamento de usuários.

### Usuários (`/users`)

-   **GET /**: Lista todos os usuários.
-   **GET /:id**: Obtém um usuário específico pelo seu ID.
-   **POST /register**: Registra um novo usuário.
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "username": "seu_usuario",
          "email": "seu_email@exemplo.com",
          "password": "sua_senha"
        }
        ```
-   **POST /login**: Autentica um usuário.
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "username": "seu_usuario",
          "password": "sua_senha"
        }
        ```
-   **PUT /:id**: Atualiza as informações de um usuário.
    -   **Corpo da requisição (JSON):**
        ```json
        {
          "username": "novo_usuario",
          "email": "novo_email@exemplo.com",
          "password": "nova_senha"
        }
        ```
-   **DELETE /:id**: Remove um usuário.
