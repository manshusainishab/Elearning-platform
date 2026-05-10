import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuid } from 'uuid';
import { s3Client, UPLOADS_BUCKET } from '../lib/s3.js';

const storage = multerS3({
    s3: s3Client,
    bucket: UPLOADS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key(req, file, cb) {
        const id = uuid();
        const extName = file.originalname.split('.').pop();
        cb(null, `uploads/${id}.${extName}`);
    },
});

export const uploadFiles = multer({ storage }).single('file');
