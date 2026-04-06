import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { plainAddPlaceholder } from 'node-signpdf/dist/helpers';
import signer from 'node-signpdf';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Recibimos la imagen en Base64 desde el Frontend
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Falta la imagen base64 del certificado' }, { status: 400 });
    }

    // 2. Limpiar el formato y convertirlo a Buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 3. 📄 FABRICAR EL PDF REAL (Usando pdf-lib)
    const pdfDoc = await PDFDocument.create();
    
    // Embed la imagen JPEG
    const image = await pdfDoc.embedJpg(imageBuffer);
    const { width, height } = image.scale(1);
    
    // Crear una página con el tamaño exacto de la imagen
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });

    // Guardar el PDF fabricado a Buffer
    const pdfBytes = await pdfDoc.save();
    const pdfBufferNode = Buffer.from(pdfBytes);
    let pdfFinalBuffer: Buffer = pdfBufferNode;

    // 4. 🔐 SELLO DIGITAL (El Arca)
    try {
      const pdfConEspacio = plainAddPlaceholder({
        pdfBuffer: pdfBufferNode,
        reason: 'Certificado Oficial VRI',
        name: 'VRI - UNA Puno',
      });

      const p12Path = path.join(process.cwd(), 'certificado_unap.p12');
      if (fs.existsSync(p12Path)) {
        const p12Buffer = fs.readFileSync(p12Path);
        pdfFinalBuffer = signer.sign(pdfConEspacio, p12Buffer, { passphrase: 'vri2026' });
        console.log("✅ PDF construido y sellado con firma digital.");
      } else {
        console.log("⚠️ Archivo .p12 no encontrado. Devolviendo PDF impecable pero sin firma.");
        pdfFinalBuffer = pdfConEspacio as Buffer; 
      }
    } catch (err) {
      console.error("Error al firmar:", err);
      // Si falla la firma, igual devolvemos el PDF válido construido
    }

    // 5. Devolvemos el PDF al Frontend en formato Base64
    return NextResponse.json({ 
      exito: true, 
      pdfFirmadoBase64: pdfFinalBuffer.toString('base64') 
    });

  } catch (error) {
    console.error("Error en servidor:", error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}