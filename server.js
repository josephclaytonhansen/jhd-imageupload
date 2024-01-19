const express = require('express')
const multer = require('multer')
const path = require('path')
const serveStatic = require('serve-static')
const fs = require('fs')
require('dotenv').config()
const speakeasy = require('speakeasy')
const uuid = require('uuid')
const session = require('express-session')

const app = express()

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true, httpOnly: true }
}))


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
  
  app.post('/verify', (req, res) => {
    // Verify TOTP code
    const isVerified = speakeasy.totp.verify({
      secret: process.env.TOTP_SECRET,
      encoding: 'base32',
      token: req.body.code,
    });
  
    if (isVerified) {
      req.session.id = uuid.v4()
      req.session.expires = Date.now() + 10 * 60 * 1000
      res.send('Verified')
    } else {
      res.status(401).send('Invalid TOTP code')
    }
  });


  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.session || !req.session.id || req.session.expires < Date.now()) {
      res.status(401).send('Not authenticated')
      return
    }
  
    res.json({ filename: req.file.filename })
  })


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