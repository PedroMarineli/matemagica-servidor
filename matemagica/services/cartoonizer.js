// Importa os pacotes usando a sintaxe de Módulo ES (import)
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

// Inicializa o GenAI com a chave da API do ambiente
// O novo SDK também aceita a chave diretamente no construtor
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// Função para converter arquivo em parte generativa
// Esta função permanece a mesma, pois o formato do objeto é compatível
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
    const prompt = "Transforme esta foto de um estudante em um desenho estilo cartoon, mantendo as características da pessoa. Retorne apenas a imagem, sem texto adicional.";

    const imageMimeType = "image/png"; // Assumindo PNG, pode ser dinâmico se necessário
    const imagePart = fileToGenerativePart(imagePath, imageMimeType);

    // --- MUDANÇA PRINCIPAL AQUI ---
    // Chamada direta ao modelo usando a nova sintaxe do SDK
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [ { text: prompt }, imagePart ], // O 'contents' é um array de partes
    });
    // --- FIM DA MUDANÇA ---

    // Acessa a resposta (sem o .response)
    // Usamos .find() para garantir que estamos pegando a parte da imagem,
    // o que é um pouco mais robusto do que apenas pegar parts[0]
    const responsePart = result.candidates[0].content.parts.find(part => part.inlineData);

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

// Usa 'export' (ES Modules) em vez de 'module.exports'
export { cartoonizeImage };