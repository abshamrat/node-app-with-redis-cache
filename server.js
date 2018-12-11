const express = require('express');
const path = require('path');
const axios = require('axios');
const redis = require('redis');
const app = express();


const port = process.env.port || 5000;
const client = redis.createClient(REDIS_URL);
const REDIS_URL = process.env.REDIS_URL || "http://localhost:6379";
const API_URL = 'https://api.exchangeratesapi.io';

client.on('connect', () => {
    console.log(`connected to redis`);
});
client.on('error', err => {
    console.log(`Error: ${err}`);
});

app.listen(port, () => {
    console.log(`App listening on port ${port}!`)
});

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: path.join(__dirname, 'views')
    });
});
app.get('/rate/:date', (req, res) => {
    const date = req.params.date;
    const url = `${API_URL}/${date}?base=USD`;
    const countKey = `USD:${date}:count`;
  const ratesKey = `USD:${date}:rates`;
  
  client.incr(countKey, (err, count) => {
    client.hgetall(ratesKey, function(err, rates) {
      if (rates) {
        return res.json({ rates, count });
      }
      axios.get(url).then(response => {
        // save the rates to the redis store
        client.hmset(
          ratesKey, response.data.rates, function(err, result) {
          if (err) console.log(err);
        });

        return res.json({ 
          count,
          rates: response.data.rates
        });
      })
      .catch(error => {
        return res.json(error.response.data)
      });

    });
  });

});

