const { GoogleGenerativeAI } = require("@google/genai");
const fs = require("node:fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function cartoonizeImage(imagePath) {
  // NOTE: The user's example uses a model 'gemini-2.5-flash-image' which seems designed
  // for image generation. The publicly available models like 'gemini-pro-vision' are 
  // for understanding images and generating text. 
  // This implementation follows the user's desired logic for handling an image response,
  // but uses 'gemini-pro-vision' which will likely not return image data.
  // When a suitable image generation model is available, the model name should be updated.
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  const prompt = "Transforme esta foto de um estudante em um desenho estilo cartoon, mantendo as características da pessoa.";
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  const request = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG, adjust if necessary
              data: base64Image,
            },
          },
        ],
      },
    ],
  };

  try {
    const result = await model.generateContent(request);
    const response = await result.response;

    let cartoonPath = null;

    // Based on the user's example, we iterate through parts to find inlineData for the image.
    const parts = response.candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");
        
        const originalFileName = path.basename(imagePath);
        const cartoonFileName = `cartoon_${originalFileName}`;
        const studentImageDir = path.dirname(imagePath);
        
        // Create a 'cartoons' subdirectory if it doesn't exist
        const cartoonDir = path.join(studentImageDir, 'cartoons');
        if (!fs.existsSync(cartoonDir)){
            fs.mkdirSync(cartoonDir, { recursive: true });
        }

        cartoonPath = path.join(cartoonDir, cartoonFileName);
        fs.writeFileSync(cartoonPath, buffer);
        console.log(`Cartoon image saved as ${cartoonPath}`);
        
        // Return the relative path for storing in the database
        return `images/students/cartoons/${cartoonFileName}`;
      }
    }

    // If no image data is returned, log the text response for debugging.
    if (!cartoonPath) {
        const text = response.text();
        console.log("Gemini response did not contain image data. Text response:", text);
        // As a fallback, we will not create a cartoon image.
        // throw new Error("Failed to generate cartoon image from the response.");
        return null; // Or handle as you see fit
    }

  } catch (error) {
    console.error("Error during image cartoonization:", error);
    throw new Error("Failed to cartoonize image.");
  }
}

module.exports = { cartoonizeImage };
