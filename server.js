const express = require('express')
const multer = require('multer')
const path = require('path')
const serveStatic = require('serve-static')
const fs = require('fs')

const app = express()

app.use(express.static('frontend'))

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
  
  app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ filename: req.file.filename });
});


  app.get('/stats', (req, res) => {
    fs.readdir('./uploads', (err, files) => {
      if (err) {
        res.status(500).send('Error reading directory');
        return
      }
  
      let totalSize = 2562000000
      let maxSize = 35000000000
  
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

  app.use('/uploads', serveStatic(path.join(__dirname, 'uploads')))

  app.listen(3000, () => console.log('Server started on port 3000'))