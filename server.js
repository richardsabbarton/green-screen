// Express for serving client HTML/JS Files
const express = require('express')
const app = express()

// Basic NERU (VCR) instance objects
console.log('Neru Instance')
const neru = require('neru-alpha').neru
console.log('getting neru state')
const state = neru.getInstanceState()


// Share the public folder as static HTML
app.use(express.static('public'))

// Redirect requests to the root to the app.html file
app.get('/', (req, res) => {
  res.redirect('/app.html')
})

// Required for health check in VCR back end
app.get('/_/health', async (req, res) => {
  res.sendStatus(200);
});

// Set the port number and then start the app listener
const port = process.env.NERU_APP_PORT || process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Application Listing ON Port: ${port}`)
})
