var express = require("express"),
  request = require("request"),
  bodyParser = require("body-parser"),
  app = express();

const ytdl = require("ytdl-core");
const fs = require("fs");

const path = "./audio.mp3";

var myLimit = typeof process.argv[2] != "undefined" ? process.argv[2] : "100kb";
console.log("Using limit: ", myLimit);

app.use(bodyParser.json({ limit: myLimit }));

app.all("/yt/audio", async (req, res) => {

  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    req.header("access-control-request-headers")
  );

  const id = req.query.id;
  const url = `https://www.youtube.com/watch?v=${id}`;

  try {
    const stream = await ytdl(url, { filter: "audioonly" }).pipe(
      fs.createWriteStream(path)
    );

    stream.on("finish", () => {
      const stat = fs.statSync(path);
      const fileSize = stat.size;
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(path, { start, end });
        const head = {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": "audio/mpeg",
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          "Content-Length": fileSize,
          "Content-Type": "audio/mpeg",
        };
        res.writeHead(200, head);
        fs.createReadStream(path).pipe(res);
      }
    });
  } catch (exception) {
    res.status(500).send(exception);
  }
});

app.get("/stream", function (req, res, next) {
  // Set CORS headers: allow all origins, methods, and headers: you may want to lock this down in a production environment
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    req.header("access-control-request-headers")
  );

  if (req.method === "OPTIONS") {
    // CORS Preflight
    res.send();
  } else {
    var targetURL = req.query.url; // Target-URL ie. https://example.com or http://example.com
    if (!targetURL) {
      res.send(500, {
        error: "There is no Target-Endpoint header in the request",
      });
      return;
    }
    request(
      {
        url: targetURL + req.url,
        method: req.method,
        json: req.body,
        headers: { Authorization: req.header("Authorization") },
      },
      function (error, response, body) {
        if (error) {
          console.error("error: " + response.statusCode);
        }
        //                console.log(body);
      }
    ).pipe(res);
  }
});

app.get("/search", function (req, res, next) {
  // Set CORS headers: allow all origins, methods, and headers: you may want to lock this down in a production environment
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    req.header("access-control-request-headers")
  );
  res.setHeader("Cache-Control", "no-cache, no-store, no-transform, max-age=0");
  if (req.method === "OPTIONS") {
    // CORS Preflight
    res.send();
  } else {
    // var targetURL = req.header('Target-URL'); // Target-URL ie. https://example.com or http://example.com
    var targetURL = req.query.url;
    // console.log(req.query)
    if (!targetURL) {
      res.send(500, {
        error: "There is no Target-Endpoint header in the request",
      });
      return;
    }
    request(
      {
        url: targetURL + req.url,
        method: req.method,
        json: req.body,
        headers: { Authorization: req.header("Authorization") },
      },
      function (error, response, body) {
        if (error) {
          console.error("error: " + response.statusCode);
        }
      }
    ).pipe(res);
  }
});

app.set("port", process.env.PORT || 3001);

app.listen(app.get("port"), function () {
  console.log("Proxy server listening on port " + app.get("port"));
});
