const dns = require("node:dns")

require("dotenv").config()
const mongoose = require("mongoose")
const express = require("express")
var bodyParser = require("body-parser")
const cors = require("cors")
const { URL } = require("node:url")

const app = express()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

// Mongoose Schema
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, default: 1 },
})

const URLModel = mongoose.model("URL", urlSchema)

// Basic Configuration
const port = process.env.PORT || 3000

app.use(cors())

app.use("/public", express.static(`${process.cwd()}/public`))

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html")
})

// Your first API endpoint
app.post("/api/shorturl", function (req, res) {
  /**@type {URL} */
  let originalUrl

  // Check Url valid
  try {
    originalUrl = new URL(req.body.url)
    // console.log(originalUrl)
  } catch (error) {
    console.log(`POST fail new URL(${req.body.url})`)
    return res.json({
      error: "Invalid URL",
      debug: "DEBUG new URL() fail",
    })
  }

  // Check Url exists
  dns.lookup(originalUrl.host, function (err, address, family) {
    if (err) {
      console.log(err)
      return res.json({
        error: "Invalid URL",
        debug: "DEBUG dns.lookup success",
      })
    }

    // Retrieve or Create record
    URLModel.findOne({ original_url: originalUrl.href }, function (err, data) {
      if (err) {
        console.log(err)
        return res.json({ debug: "DEBUG findOne() fail" })
      }

      // Url already exist, return
      if (data) {
        return res.json({
          original_url: data.original_url,
          short_url: data.short_url,
          debug: "DEBUG findOne() success",
        })
      }

      // No records in collection
      // Skip that for now...

      // Calculate new short_url
      URLModel.count({}, function (err, count) {
        const newShortUrl = count + 1
        console.log(`newShortUrl: ${newShortUrl}`)

        // Create new document
        const newUrlDoc = new URLModel({
          original_url: originalUrl.href,
          short_url: newShortUrl,
        })

        console.log(`newUrlDoc: ${newUrlDoc}`)

        // Save and return
        newUrlDoc.save(function (err, data) {
          return res.json({
            original_url: originalUrl.href,
            short_url: newShortUrl,
          })
        })
      })
      //
    })
  })
})

app.get("/api/shorturl/:short?", function (req, res) {
  let shortUrl

  try {
    // console.log(`Received req.params.short: ${req.params.short}`)
    shortUrl = Number(req.params.short)
  } catch (error) {
    res.json({
      error: "Wrong format",
    })
  }

  URLModel.findOne({ short_url: shortUrl }, function (err, data) {
    if (data) {
      console.log(`findOne redirect ${data.original_url}`)
      return res.redirect(data.original_url)
    }

    return res.json({
      error: "No short URL found for the given input",
    })
  })
})

app.delete("/api/shorturl", function (req, res) {
  URLModel.deleteMany({}, function (err) {
    const newUrl = new URLModel({
      original_url: "https://freecodecamp.org/",
      short_url: 1,
    })
    newUrl.save(function (err, data) {
      res.json({ message: "deleteMany() and created one" })
    })
  })
})

app.listen(port, function () {
  console.log(`Listening on port ${port}`)
})
