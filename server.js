const express = require('express')
const multer = require('multer')
const path = require('path')
const serveStatic = require('serve-static')
const fs = require('fs')
require('dotenv').config()
const speakeasy = require('speakeasy')
const sharp = require('sharp')
const nodemailer = require('nodemailer')
const cors = require('cors')

process.env.TZ = 'America/Chicago'

const app = express()

app.use(express.static('frontend'))
app.use(express.json())

const corsOptions = {
  origin: ['https://josephhansen.dev','https://www.josephhansen.dev','https://localhost:3000', 'https://images.josephhansen.dev', 'https://www.images.josephhansen.dev', 'https://hansenfamily.cc', 'https://www.hansenfamily.cc', 'https://hansenstudios.art', 'https://www.hansenstudios.art'],
}

app.use(cors(corsOptions))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    let removeWhitespace = file.originalname.replace(/\s/g, '');
    let first12 = removeWhitespace.substring(0, 12);

    let filename =  file.fieldname + first12 + '-' + Date.now() + path.extname(file.originalname);
    
    filename = encodeURIComponent(filename);
    
    cb(null, filename);
  }
});
  
  const upload = multer({ storage: storage })
  

  app.post('/api/forms/submit', (req, res) => {

    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_FROM_USERNAME,
        pass: process.env.EMAIL_FROM_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })
    
    let text = ''
    if (req.body.form === 'pricing'){
      text = `Name: ${req.body.name}\n\nEmail: ${req.body.email}\n\nWebsite: ${req.body.website}\n\nNotes: ${req.body.notes}\n\nServices: ${req.body.services}\n\nTotal: ${req.body.total}\n\nReferring page: ${req.body.referrer}`
    }
    else if (req.body.form === 'contact'){
      text = `Name: ${req.body.name}\n\nEmail: ${req.body.email}\n\nMessage: ${req.body.message}\n\nReferring page: ${req.body.referrer}`
    }
    
    let mailOptions = {
      from: process.env.EMAIL_FROM_USERNAME,
      to: process.env.EMAIL_TO,
      subject: 'New ' + req.body.form + ' Request' + ' from ' + req.body.name + ' (' + req.body.email + ')',
      text: text,
    }

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err)
        res.status(500).send('Error sending email')
      } else {
        res.send('Email sent')
      }
    })
  })

  app.post('/api/upload', (req, res, next) => {
    const token = req.header('X-TOTP-Token');
    const isVerified = speakeasy.totp.verify({
      secret: process.env.TOTP_SECRET,
      encoding: 'base32',
      token: token,
      window: 2
    });
  
    if (isVerified) {
      next();
    } else {
      res.status(401).send('Invalid code');
    }
  }, upload.single('file'), (req, res) => {
    if (!req.file.filename.endsWith('.pdf')) {
      const newFilename = path.basename(req.file.filename, path.extname(req.file.filename)) + '.webp'
      const newPath = path.join(path.dirname(req.file.path), newFilename)
    
      sharp(req.file.path)
        .resize(1000)
        .toFormat('webp')
        .toFile(newPath, (err) => {
          if (err) {
            res.status(500).json({ error: err })
          } else {
            fs.unlink(req.file.path, (err) => {
              if (err) {
                console.error(`Failed to delete original file: ${err}`)
              }
            })
            res.json({ filename: newFilename })
          }
        })
    } else {
      res.json({ filename: req.file.filename })
    }
  })


  app.get('/api/stats', (req, res) => {
    fs.readdir('./uploads', (err, files) => {
      if (err) {
        res.status(500).send('Error reading directory')
        return
      }
  
      let totalSize = 4747738 * 1024
      let maxSize = 52109060 * 1024
  
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

  app.get('/api/all', (req, res) => {
    fs.readdir('./uploads', (err, files) => {
      if (err) {
        res.status(500).send('Error reading directory')
        return
      }
  
      res.send(files)
    })
  })

  app.use('/api/uploads', serveStatic(path.join(__dirname, 'uploads')))

  app.listen(3000, () => console.log('Server started on port 3000'))