const path = require('path');

// Define a raiz pública onde as imagens são servidas
const PUBLIC_ROOT = '/images/students/';

/**
 * Formata a URL completa para a foto de um aluno.
 * @param {string} filename - O nome do ficheiro da imagem.
 * @param {object} req - O objeto de requisição do Express.
 * @returns {string|null} A URL completa da imagem ou null se não houver filename.
 */
function formatStudentPhotoUrl(filename, req) {
    if (!filename) {
        return null;
    }
    // Constrói a URL base (http://localhost:3000)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // Junta a base URL com o caminho público e o nome do ficheiro
    return new URL(path.join(PUBLIC_ROOT, filename), baseUrl).href;
}

module.exports = {
    formatStudentPhotoUrl,
    PUBLIC_ROOT
};