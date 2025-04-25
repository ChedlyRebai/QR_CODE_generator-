import express, { Request, Response } from 'express';
import QRCode from 'qrcode';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Configure Cloudinary
// Configure Cloudinary
cloudinary.config({
    cloud_name: "dhcahq9zs",
    api_key: "987473759638663",
    api_secret: "LbEfOEzP82agA5UeiMLqx63Kq1U",
  });
  
interface QRCodeRequest {
  text: string;
  size?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

// Generate QR Code endpoint
app.post('/api/qrcode', async (req: Request<{}, {}, QRCodeRequest>, res: Response) => {
  try {
    const { text, size = 300, color = {} } = req.body;
    const { dark = '#000000', light = '#ffffff' } = color;

    if (!text) {
      //return res.status(400).json({ error: "Text content is required" });
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    // Generate QR code as a data URL
    const qrDataUrl = await QRCode.toDataURL(text, {
      width: size,
      color: {
        dark,
        light
      }
    });

    // Convert data URL to buffer
    const buffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // Upload to Cloudinary
    const uploadResult:any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "qrcodes",
          public_id: `qr-${Date.now()}`,
          format: 'png',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Convert buffer to stream
      const bufferStream = new Readable();
      bufferStream.push(buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });

    res.json({ 
      success: true,
      qrCodeUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      info: {
        originalText: text,
        size,
        colors: {
          dark,
          light
        }
      }
    });

  } catch (error: any) {
    console.error("Error generating QR code:", error.message);
    res.status(500).json({ 
      error: "Failed to generate QR code",
      details: error.message 
    });
  }
});

// Delete QR Code endpoint
app.delete('/api/qrcode/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const result = await cloudinary.uploader.destroy(publicId);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete QR code", details: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    endpoints: {
      generateQR: 'POST /api/qrcode',
      deleteQR: 'DELETE /api/qrcode/:publicId'
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app; // Export the app for testing purposes