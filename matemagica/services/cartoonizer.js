const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// Inicializa o GenAI com a chave da API do ambiente
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função para converter arquivo em parte generativa
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType,
    },
  };
}

async function cartoonizeImage(imagePath) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "SUA_CHAVE_DE_API_AQUI") {
    console.warn("GEMINI_API_KEY not set or is default. Skipping cartoonize.");
    return null;
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    const prompt = "Transforme esta foto de um estudante em um desenho estilo cartoon, mantendo as características da pessoa. Retorne apenas a imagem, sem texto adicional.";

    const imageMimeType = "image/png"; // Assumindo PNG, pode ser dinâmico se necessário
    const imagePart = fileToGenerativePart(imagePath, imageMimeType);

    const result = await model.generateContent([prompt, imagePart]);
    
    // Assumindo que a API retorna a imagem como a primeira parte
    const responsePart = result.response.candidates[0].content.parts[0];

    if (responsePart && responsePart.inlineData) {
      const imageData = responsePart.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      
      // Cria um nome de arquivo único para a imagem cartoonizada
      const originalFileName = path.basename(imagePath, path.extname(imagePath));
      const cartoonFileName = `cartoon-${originalFileName}-${Date.now()}.png`;
      const outputPath = path.join('public', 'images', 'students', cartoonFileName);
      
      // Garante que o diretório de destino exista
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      
      fs.writeFileSync(outputPath, buffer);
      console.log(`Image saved as ${outputPath}`);
      return outputPath; // Retorna o caminho relativo para salvar no DB
    } else {
      throw new Error("Could not generate cartoon image from the response.");
    }
  } catch (error) {
    console.error("Error during cartoonizeImage:", error.message);
    // Retorna null para não quebrar o fluxo principal
    return null;
  }
}

module.exports = { cartoonizeImage };