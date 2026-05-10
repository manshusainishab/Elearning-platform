import 'dotenv/config';
import express from 'express';
import { connectDb } from './database/db.js';
import Razorpay from 'razorpay'
import cors from 'cors';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, UPLOADS_BUCKET } from './lib/s3.js';

export const instance = new Razorpay({
    key_id: process.env.Razorpay_Key,
    key_secret: process.env.Razorpay_Secret,
})

const app = express();


//using middlewares
app.use(express.json());
app.use(cors())

const port = process.env.PORT;

app.get('/',(req,res)=>{
    res.send("server is working");
})

app.get('/uploads/*', async (req, res) => {
    const key = req.path.slice(1);
    try {
        const obj = await s3Client.send(new GetObjectCommand({
            Bucket: UPLOADS_BUCKET,
            Key: key,
        }));
        if (obj.ContentType) {res.set('Content-Type', obj.ContentType);}
        if (obj.ContentLength) {res.set('Content-Length', obj.ContentLength);}
        obj.Body.pipe(res);
    } catch (err) {
        if (err.name === 'NoSuchKey') {return res.status(404).send('Not found');}
        res.status(500).send(err.message);
    }
});

//importing routes
import userRoutes from './routes/user.js'
import courseRoutes from './routes/course.js'
import adminRoutes from './routes/admin.js'

//using routes
app.use('/api', userRoutes);
app.use('/api', courseRoutes);
app.use('/api', adminRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});



app.listen(port, "0.0.0.0", ()=>{
    console.log(`Server is running on PORT: ${port}`);
    connectDb();
})
