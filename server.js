const express = require('express')
const multer = require('multer')
const path = require('path')
const serveStatic = require('serve-static')
const fs = require('fs')
require('dotenv').config()
const speakeasy = require('speakeasy')

const app = express()

app.use(express.static('frontend'))
app.use(express.json())

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    let filename = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
    
    filename = encodeURIComponent(filename);
    
    cb(null, filename);
  }
});
  
  const upload = multer({ storage: storage })
  

  app.post('/api/upload', upload.single('file'), (req, res) => {
    const token = req.header('X-TOTP-Token');
    const isVerified = speakeasy.totp.verify({
      secret: process.env.TOTP_SECRET,
      encoding: 'base32',
      token: token,
    });
  
    if (isVerified) {
      res.json({ filename: req.file.filename });
    } else {
      res.status(401).send('Invalid code');
    }
  });


  app.get('/api/stats', (req, res) => {
    fs.readdir('./uploads', (err, files) => {
      if (err) {
        res.status(500).send('Error reading directory')
        return
      }
  
      let totalSize = 3522714 * 1024
      let maxSize = 36152472 * 1024
  
      files.forEach(file => {
        totalSize += fs.statSync('./uploads/' + file).size
      });
  
      res.send({
        numberOfImages: files.length,
        totalSize: totalSize,
        maxSize: maxSize
      })
    })
  })

  app.use('/api/uploads', serveStatic(path.join(__dirname, 'uploads')))

  app.listen(3000, () => console.log('Server started on port 3000'))